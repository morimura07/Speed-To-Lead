import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { TokenService } from '../token.service';
import { extractBearer } from './jwt-auth.guard';
import type { AuthAdmin } from '../auth.types';

/** Authenticates the platform admin from a Bearer access token. */
@Injectable()
export class AdminJwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { admin?: AuthAdmin }>();
    const token = extractBearer(request);
    if (!token) throw new UnauthorizedException('Missing access token');

    const payload = this.tokens.verifyAccessToken(token);
    if (payload.typ !== 'admin') {
      throw new UnauthorizedException('Admin access required');
    }

    request.admin = { adminId: payload.sub };
    return true;
  }
}
