import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import twilio, { type Twilio } from 'twilio';
import { AppConfigService } from '../config/config.module';
import type { RingRepInput, TelephonyProvider } from './telephony.types';

/**
 * Twilio implementation of the telephony surface. The SDK client is created
 * lazily on first use, so the API boots without credentials; when unconfigured,
 * outbound operations fail loudly rather than silently dropping a lead.
 */
@Injectable()
export class TwilioProvider implements TelephonyProvider {
  private readonly logger = new Logger(TwilioProvider.name);
  private client: Twilio | null = null;

  constructor(private readonly config: AppConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get('TWILIO_ACCOUNT_SID') &&
        this.config.get('TWILIO_AUTH_TOKEN') &&
        this.config.get('TWILIO_FROM_NUMBER'),
    );
  }

  private getClient(): Twilio {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Telephony provider is not configured');
    }
    if (!this.client) {
      this.client = twilio(
        this.config.get('TWILIO_ACCOUNT_SID'),
        this.config.get('TWILIO_AUTH_TOKEN'),
      );
    }
    return this.client;
  }

  async ringRep(input: RingRepInput): Promise<{ callId: string }> {
    const call = await this.getClient().calls.create({
      to: input.to,
      from: this.config.get('TWILIO_FROM_NUMBER')!,
      url: input.answerUrl,
      method: 'POST',
      statusCallback: input.statusCallbackUrl,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['completed'],
      timeout: input.timeoutSeconds,
    });
    this.logger.debug(`Placed call ${call.sid} to ${input.to}`);
    return { callId: call.sid };
  }

  async sendSms(to: string, body: string): Promise<void> {
    // Prefer the A2P Messaging Service (campaign association + Advanced Opt-Out)
    // when configured; otherwise fall back to the bare from-number.
    const messagingServiceSid = this.config.get('TWILIO_MESSAGING_SERVICE_SID');
    const sender = messagingServiceSid
      ? { messagingServiceSid }
      : { from: this.config.get('TWILIO_FROM_NUMBER')! };
    await this.getClient().messages.create({ to, body, ...sender });
  }

  async cancelCall(callId: string): Promise<void> {
    try {
      await this.getClient().calls(callId).update({ status: 'completed' });
    } catch (err) {
      this.logger.warn(`Failed to cancel call ${callId}: ${String(err)}`);
    }
  }
}
