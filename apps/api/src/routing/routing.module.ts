import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RepsModule } from '../reps/reps.module';
import { RoutingService } from './routing.service';
import { RoutingWorker } from './routing.worker';
import { RoutingConfigController } from './routing-config.controller';
import { TelephonyWebhookController } from './telephony-webhook.controller';
import { PushoverService } from '../notifications/pushover.service';

/**
 * The routing engine: the state machine (RoutingService), the queue worker that
 * feeds it, the inbound Twilio webhook controller, and the routing-config API.
 *
 * Depends on RepsModule (eligible reps) and the global TelephonyModule
 * (provider + webhook guard). The webhook controller lives here — not in the
 * telephony module — to keep telephony free of any routing dependency.
 */
@Module({
  imports: [AuthModule, RepsModule],
  controllers: [RoutingConfigController, TelephonyWebhookController],
  providers: [RoutingService, RoutingWorker, PushoverService],
  exports: [RoutingService],
})
export class RoutingModule {}
