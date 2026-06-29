import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { DEFAULT_TRIAL_DAYS } from '@leadarrow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/config.module';
import { MailService } from '../common/mail/mail.service';
import { hashPassword, verifyPassword } from '../common/crypto/password.util';
import { generateOpaqueToken, hashToken } from '../common/crypto/token.util';
import { TokenService } from './token.service';
import type { SignupDto } from './dto/signup.dto';
import type { LoginDto } from './dto/login.dto';
import type { AuthTokens } from './auth.types';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organization: {
    id: string;
    name: string;
    subscriptionStatus: string;
    trialEndsAt: string | null;
    trialDaysRemaining: number | null;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
  ) {}

  // ── Sign-up (license-gated) ────────────────────────────────────────────────

  async signup(dto: SignupDto): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const email = dto.email.toLowerCase().trim();
    const code = dto.licenseKey.trim().toUpperCase();

    // Fail fast on a duplicate email (the DB unique constraint is the backstop).
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const key = await this.prisma.licenseKey.findUnique({ where: { code } });
    if (!key || key.status !== 'active') {
      throw new BadRequestException('Invalid or already-used license key');
    }

    const passwordHash = await hashPassword(dto.password);

    const isUnlimited = key.type === 'unlimited';
    const trialDays = key.trialDays ?? DEFAULT_TRIAL_DAYS;
    const trialEndsAt = isUnlimited ? null : new Date(Date.now() + trialDays * 86_400_000);
    const now = new Date();

    const userId = await this.prisma.$transaction(async (tx) => {
      // Atomically claim the key; the status guard prevents a double-redeem race.
      const claimed = await tx.licenseKey.updateMany({
        where: { code, status: 'active' },
        data: { status: 'redeemed', redeemedAt: now },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('Invalid or already-used license key');
      }

      const org = await tx.organization.create({
        data: {
          name: dto.companyName.trim(),
          phone: dto.phone.trim(),
          smsConsent: dto.smsConsent,
          smsConsentAt: dto.smsConsent ? now : null,
          trialEndsAt,
          subscriptionStatus: isUnlimited ? 'active' : 'trialing',
        },
      });

      await tx.licenseKey.update({
        where: { code },
        data: { redeemedByOrgId: org.id },
      });

      const user = await tx.user.create({
        data: {
          orgId: org.id,
          email,
          name: dto.fullName.trim(),
          passwordHash,
          role: 'admin', // the company owner
        },
      });

      return user.id;
    });

    this.logger.log(`New organization signed up (user=${userId})`);

    const profile = await this.buildProfile(userId);
    const tokens = await this.tokens.issueTokens({
      sub: profile.id,
      typ: 'user',
      orgId: profile.organization.id,
      role: 'admin',
    });

    return { user: profile, tokens };
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !(await verifyPassword(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const profile = await this.buildProfile(user.id);
    const tokens = await this.tokens.issueTokens({
      sub: user.id,
      typ: 'user',
      orgId: user.orgId,
      role: user.role,
    });

    return { user: profile, tokens };
  }

  async adminLogin(dto: LoginDto): Promise<{ admin: { id: string; email: string; name: string }; tokens: AuthTokens }> {
    const email = dto.email.toLowerCase().trim();
    const admin = await this.prisma.platformAdmin.findUnique({ where: { email } });

    if (!admin || !(await verifyPassword(admin.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.tokens.issueTokens({ sub: admin.id, typ: 'admin' });
    return { admin: { id: admin.id, email: admin.email, name: admin.name }, tokens };
  }

  // ── Session lifecycle ────────────────────────────────────────────────────

  async refresh(rawToken: string): Promise<AuthTokens> {
    const subject = await this.tokens.rotate(rawToken);

    if ('adminId' in subject) {
      const admin = await this.prisma.platformAdmin.findUnique({ where: { id: subject.adminId } });
      if (!admin) throw new UnauthorizedException('Session no longer valid');
      return this.tokens.issueTokens({ sub: admin.id, typ: 'admin' });
    }

    const user = await this.prisma.user.findUnique({ where: { id: subject.userId } });
    if (!user) throw new UnauthorizedException('Session no longer valid');
    return this.tokens.issueTokens({
      sub: user.id,
      typ: 'user',
      orgId: user.orgId,
      role: user.role,
    });
  }

  async logout(rawToken: string): Promise<void> {
    await this.tokens.revoke(rawToken);
  }

  // ── Password recovery ────────────────────────────────────────────────────

  async forgotPassword(rawEmail: string): Promise<void> {
    const email = rawEmail.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return success to avoid leaking which emails are registered.
    if (!user) {
      this.logger.debug(`Password reset requested for unknown email: ${email}`);
      return;
    }

    const rawToken = generateOpaqueToken(32);
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const resetUrl = `${this.config.get('APP_URL')}/reset-password?token=${rawToken}`;
    await this.mail.sendPasswordReset(email, resetUrl);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('This reset link is invalid or has expired');
    }

    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Force re-login everywhere after a password change.
    await this.tokens.revokeAllForUser(record.userId);
  }

  // ── Profiles ──────────────────────────────────────────────────────────────

  async me(userId: string): Promise<UserProfile> {
    return this.buildProfile(userId);
  }

  async adminMe(adminId: string): Promise<{ id: string; email: string; name: string }> {
    const admin = await this.prisma.platformAdmin.findUnique({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException('Session no longer valid');
    return { id: admin.id, email: admin.email, name: admin.name };
  }

  private async buildProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { organization: true },
    });

    const { organization: org } = user;
    const trialDaysRemaining =
      org.trialEndsAt == null
        ? null
        : Math.max(0, Math.ceil((org.trialEndsAt.getTime() - Date.now()) / 86_400_000));

    return {
      id: user.id,
      email: user.email,
      fullName: user.name,
      role: user.role,
      organization: {
        id: org.id,
        name: org.name,
        subscriptionStatus: org.subscriptionStatus,
        trialEndsAt: org.trialEndsAt?.toISOString() ?? null,
        trialDaysRemaining,
      },
    };
  }
}
