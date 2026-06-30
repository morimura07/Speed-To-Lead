import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../billing/subscription.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller('leads')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  /** Recent leads for the signed-in user's organization. */
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const takeN = Math.min(Math.max(Number(take) || 50, 1), 100);
    const skipN = Math.max(Number(skip) || 0, 0);
    return this.leads.listForOrg(user.orgId, takeN, skipN);
  }
}
