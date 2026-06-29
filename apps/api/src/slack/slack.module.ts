import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LeadsModule } from '../leads/leads.module';
import { SlackService } from './slack.service';
import { SlackController } from './slack.controller';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { BookingVoiceController } from './booking-voice.controller';

/**
 * Slack integration: the Events API webhook (lead source + booking alerts),
 * the booking flow (triage/closer), and the booking-alert call webhooks.
 */
@Module({
  imports: [AuthModule, LeadsModule],
  controllers: [SlackController, BookingController, BookingVoiceController],
  providers: [SlackService, BookingService],
})
export class SlackModule {}
