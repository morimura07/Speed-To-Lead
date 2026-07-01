import { Controller, Get, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../billing/subscription.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller('bookings')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.booking.listForOrg(user.orgId);
  }
}
