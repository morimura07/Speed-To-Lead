import { Controller, Header, Param, Post, UseGuards } from '@nestjs/common';
import twilio from 'twilio';
import { BookingService } from './booking.service';
import { TwilioWebhookGuard } from '../telephony/twilio-webhook.guard';

const { VoiceResponse } = twilio.twiml;

/** Inbound Twilio voice webhooks for booking-alert calls (reads the booking). */
@Controller('telephony')
@UseGuards(TwilioWebhookGuard)
export class BookingVoiceController {
  constructor(private readonly booking: BookingService) {}

  @Post('booking/:id')
  @Header('Content-Type', 'text/xml')
  async voice(@Param('id') id: string): Promise<string> {
    const title = await this.booking.titleFor(id);
    const vr = new VoiceResponse();
    vr.say(title ? `New booking alert. ${title}. Goodbye.` : 'New booking alert. Goodbye.');
    vr.hangup();
    return vr.toString();
  }

  @Post('booking/:id/status')
  @Header('Content-Type', 'text/xml')
  status(): string {
    return new VoiceResponse().toString();
  }
}
