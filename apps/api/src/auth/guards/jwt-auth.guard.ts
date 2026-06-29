import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { TokenService } from '../token.service';
import type { AuthUser } from '../auth.types';

/** Authenticates company users from a Bearer access token. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = extractBearer(request);
    if (!token) throw new UnauthorizedException('Missing access token');

    const payload = this.tokens.verifyAccessToken(token);
    if (payload.typ !== 'user' || !payload.orgId || !payload.role) {
      throw new UnauthorizedException('Invalid access token');
    }

    request.user = { userId: payload.sub, orgId: payload.orgId, role: payload.role };
    return true;
  }
}

export function extractBearer(request: Request): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  return scheme === 'Bearer' && value ? value : null;
}
