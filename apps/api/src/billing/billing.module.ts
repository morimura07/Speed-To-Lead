import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing-webhook.controller';
import { SubscriptionGuard } from './subscription.guard';

/**
 * Stripe billing + the subscription gate. Global so the SubscriptionGuard can
 * be applied by any feature controller without re-importing.
 */
@Global()
@Module({
  imports: [AuthModule],
  controllers: [BillingController, BillingWebhookController],
  providers: [BillingService, SubscriptionGuard],
  exports: [SubscriptionGuard],
})
export class BillingModule {}
