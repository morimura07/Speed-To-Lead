import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { hasActiveAccess } from './subscription.util';
import type { AuthUser } from '../auth/auth.types';

/**
 * Blocks product access once a trial has expired and there's no active
 * subscription, responding 402 Payment Required. Must run after JwtAuthGuard
 * (which attaches the user/org).
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const orgId = request.user?.orgId;
    if (!orgId) return true; // not an authenticated org route

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { subscriptionStatus: true, trialEndsAt: true },
    });
    if (org && !hasActiveAccess(org)) {
      throw new HttpException(
        { statusCode: HttpStatus.PAYMENT_REQUIRED, error: 'SubscriptionRequired', message: 'Your trial has ended. Please subscribe to continue.' },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    return true;
  }
}
