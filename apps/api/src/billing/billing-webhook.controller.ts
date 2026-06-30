import { Controller, HttpCode, HttpStatus, Logger, Post, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { BillingService } from './billing.service';

/**
 * Public Stripe webhook. Verifies the signature against the raw body, then
 * applies the event (activate subscription, mark canceled/past_due). Always
 * returns 200 quickly so Stripe doesn't retry on our processing time.
 */
@SkipThrottle()
@Controller('billing')
export class BillingWebhookController {
  private readonly logger = new Logger(BillingWebhookController.name);

  constructor(private readonly billing: BillingService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.header('stripe-signature');
    const rawBody = req.rawBody?.toString('utf8');
    if (!signature || !rawBody) return { received: false };

    try {
      const event = this.billing.constructEvent(rawBody, signature);
      await this.billing.handleEvent(event);
      return { received: true };
    } catch (err) {
      this.logger.warn(`Stripe webhook rejected: ${String(err)}`);
      return { received: false };
    }
  }
}
