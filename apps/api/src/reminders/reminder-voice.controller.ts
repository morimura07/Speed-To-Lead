import { Controller, Header, Param, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import twilio from 'twilio';
import { RemindersService } from './reminders.service';
import { TwilioWebhookGuard } from '../telephony/twilio-webhook.guard';

const { VoiceResponse } = twilio.twiml;

/**
 * Inbound Twilio voice webhooks for follow-up reminder calls: read the note to
 * the rep. Shares the /telephony prefix with the routing webhooks but uses
 * distinct paths.
 */
@SkipThrottle()
@Controller('telephony')
@UseGuards(TwilioWebhookGuard)
export class ReminderVoiceController {
  constructor(private readonly reminders: RemindersService) {}

  @Post('reminder/:id')
  @Header('Content-Type', 'text/xml')
  async voice(@Param('id') id: string): Promise<string> {
    const note = await this.reminders.noteFor(id);
    const vr = new VoiceResponse();
    vr.say(
      note
        ? `LeadArrow follow-up reminder. ${note}. Goodbye.`
        : 'LeadArrow follow-up reminder. Goodbye.',
    );
    vr.hangup();
    return vr.toString();
  }

  @Post('reminder/:id/status')
  @Header('Content-Type', 'text/xml')
  status(): string {
    return new VoiceResponse().toString();
  }
}
