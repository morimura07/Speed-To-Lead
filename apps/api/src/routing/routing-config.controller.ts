import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { UpdateRoutingConfigDto } from './dto/routing-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../billing/subscription.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller('routing/config')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class RoutingConfigController {
  constructor(private readonly routing: RoutingService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.routing.getConfig(user.orgId);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateRoutingConfigDto) {
    return this.routing.setConfig(user.orgId, dto);
  }
}
