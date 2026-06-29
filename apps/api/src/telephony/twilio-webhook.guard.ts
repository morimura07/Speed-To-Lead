import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { validateRequest } from 'twilio';
import type { Request } from 'express';
import { AppConfigService } from '../config/config.module';

/**
 * Verifies the `X-Twilio-Signature` header on inbound telephony webhooks so only
 * genuine Twilio requests can drive the routing state machine.
 *
 * Auto-skips when no auth token is configured (local dev) or when
 * TWILIO_VALIDATE_SIGNATURE is false — so the flow is testable without Twilio.
 */
@Injectable()
export class TwilioWebhookGuard implements CanActivate {
  private readonly logger = new Logger(TwilioWebhookGuard.name);

  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const authToken = this.config.get('TWILIO_AUTH_TOKEN');
    if (!authToken || !this.config.get('TWILIO_VALIDATE_SIGNATURE')) {
      return true; // validation disabled / not configured
    }

    const req = context.switchToHttp().getRequest<Request>();
    const signature = req.header('X-Twilio-Signature') ?? '';

    // Twilio signs the absolute URL it called; reconstruct it from config + path.
    const url = `${this.config.get('API_PUBLIC_URL')}${req.originalUrl}`;
    const params = (req.body ?? {}) as Record<string, string>;

    const valid = validateRequest(authToken, signature, url, params);
    if (!valid) this.logger.warn(`Rejected webhook with invalid Twilio signature: ${req.originalUrl}`);
    return valid;
  }
}
