import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/config.module';
import { generateOpaqueToken, hashToken } from '../common/crypto/token.util';
import { fromNow } from '../common/time/duration.util';
import type { AuthTokens, JwtPayload } from './auth.types';

/** Identifies the owner of a refresh token — exactly one field is set. */
type RefreshSubject = { userId: string } | { adminId: string };

/**
 * Issues access tokens (stateless JWTs) and manages refresh tokens (opaque,
 * high-entropy strings persisted only as SHA-256 digests). Refresh uses
 * rotation: each use revokes the old token and issues a new one, so a stolen
 * token is single-use and detectable.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  private signAccessToken(payload: JwtPayload): string {
    // `expiresIn` is typed as a literal duration union by @nestjs/jwt; our config
    // value is a validated duration string, so the cast is sound.
    const expiresIn = this.config.get('JWT_ACCESS_TTL') as `${number}${'s' | 'm' | 'h' | 'd'}`;
    return this.jwt.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn,
    });
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.jwt.verify<JwtPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async issueRefreshToken(subject: RefreshSubject): Promise<string> {
    const raw = generateOpaqueToken();
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(raw),
        expiresAt: fromNow(this.config.get('JWT_REFRESH_TTL')),
        ...subject,
      },
    });
    return raw;
  }

  /** Mint a fresh access + refresh token pair for a subject. */
  async issueTokens(payload: JwtPayload): Promise<AuthTokens> {
    const subject: RefreshSubject =
      payload.typ === 'admin' ? { adminId: payload.sub } : { userId: payload.sub };

    const [accessToken, refreshToken] = await Promise.all([
      Promise.resolve(this.signAccessToken(payload)),
      this.issueRefreshToken(subject),
    ]);

    return { accessToken, refreshToken, expiresIn: this.config.get('JWT_ACCESS_TTL') };
  }

  /**
   * Validate a refresh token and rotate it. Returns the subject so the caller
   * can rebuild a full access payload (with current role/org).
   */
  async rotate(rawToken: string): Promise<RefreshSubject> {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return record.adminId ? { adminId: record.adminId } : { userId: record.userId! };
  }

  /** Revoke a single refresh token (logout of one session). */
  async revoke(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Revoke every active refresh token for a user (e.g. after a password reset). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
