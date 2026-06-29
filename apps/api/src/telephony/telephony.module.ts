import { Global, Module } from '@nestjs/common';
import { TwilioProvider } from './twilio.provider';
import { TwilioWebhookGuard } from './twilio-webhook.guard';
import { TELEPHONY_PROVIDER } from './telephony.types';

/**
 * Telephony provider (outbound calls/SMS) + inbound webhook signature guard.
 * Global so the routing engine can inject the provider and its webhook
 * controller can use the guard.
 */
@Global()
@Module({
  providers: [
    TwilioProvider,
    { provide: TELEPHONY_PROVIDER, useExisting: TwilioProvider },
    TwilioWebhookGuard,
  ],
  exports: [TELEPHONY_PROVIDER, TwilioWebhookGuard],
})
export class TelephonyModule {}
