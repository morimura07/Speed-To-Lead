import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth.types';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('status')
  status(@CurrentUser() user: AuthUser) {
    return this.billing.getStatus(user.orgId);
  }

  /** Start a Stripe Checkout session for the subscription. */
  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  async checkout(@CurrentUser() user: AuthUser) {
    const dbUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
      select: { email: true },
    });
    return this.billing.createCheckout(user.orgId, dbUser.email);
  }
}
