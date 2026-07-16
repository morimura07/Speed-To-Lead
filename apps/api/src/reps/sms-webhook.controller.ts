import { Body, Controller, Header, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import twilio from 'twilio';
import { RepsService } from './reps.service';
import { TwilioWebhookGuard } from '../telephony/twilio-webhook.guard';

const { MessagingResponse } = twilio.twiml;

const STOP_WORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);
const START_WORDS = new Set(['START', 'YES', 'UNSTOP']);

/**
 * Inbound SMS webhook for opt-out compliance (A2P 10DLC / TCPA). Twilio's
 * Advanced Opt-Out handles the carrier-level block + auto-reply; here we record
 * the opt-out on the rep so we also stop trying to text them.
 */
@SkipThrottle()
@Controller('telephony')
@UseGuards(TwilioWebhookGuard)
export class SmsWebhookController {
  constructor(private readonly reps: RepsService) {}

  @Post('sms')
  @Header('Content-Type', 'text/xml')
  async sms(@Body('From') from?: string, @Body('Body') body?: string): Promise<string> {
    const keyword = (body ?? '').trim().toUpperCase();
    if (from) {
      if (STOP_WORDS.has(keyword)) await this.reps.setSmsOptOut(from, true);
      else if (START_WORDS.has(keyword)) await this.reps.setSmsOptOut(from, false);
    }
    // Empty TwiML — Twilio's opt-out keywords send the compliant auto-reply.
    return new MessagingResponse().toString();
  }
}
