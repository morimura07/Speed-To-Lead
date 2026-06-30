import { Body, Controller, Header, Param, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import twilio from 'twilio';
import { RoutingService } from './routing.service';
import { TwilioWebhookGuard } from '../telephony/twilio-webhook.guard';
import { AppConfigService } from '../config/config.module';

const { VoiceResponse } = twilio.twiml;

/**
 * Inbound Twilio voice webhooks that drive the IVR and the routing state
 * machine. Every response is TwiML (text/xml). Guarded by signature validation.
 *
 * The state machine is resilient to webhook ordering/duplication via atomic
 * attempt claims, so these handlers can simply translate Twilio events into
 * RoutingService calls.
 */
@SkipThrottle()
@Controller('telephony')
@UseGuards(TwilioWebhookGuard)
export class TelephonyWebhookController {
  constructor(
    private readonly routing: RoutingService,
    private readonly config: AppConfigService,
  ) {}

  /** Played when the rep answers: announce the lead and gather a keypress. */
  @Post('voice/:attemptId')
  @Header('Content-Type', 'text/xml')
  async voice(@Param('attemptId') attemptId: string): Promise<string> {
    const info = await this.routing.getPrompt(attemptId);
    const vr = new VoiceResponse();

    const gather = vr.gather({
      numDigits: 1,
      action: `${this.config.get('API_PUBLIC_URL')}/v1/telephony/gather/${attemptId}`,
      method: 'POST',
      timeout: 12,
    });
    gather.say(
      info
        ? `New lead. ${info.name} from ${info.source}. Press 1 to accept, press 2 to decline.`
        : 'New lead. Press 1 to accept, press 2 to decline.',
    );

    // Reached only if the rep answered but pressed nothing; the call then ends
    // and the status callback re-routes the lead.
    vr.say('No response received. Goodbye.');
    vr.hangup();
    return vr.toString();
  }

  /** The rep pressed a key. */
  @Post('gather/:attemptId')
  @Header('Content-Type', 'text/xml')
  async gather(
    @Param('attemptId') attemptId: string,
    @Body('Digits') digits?: string,
  ): Promise<string> {
    const vr = new VoiceResponse();

    if (digits === '1') {
      await this.routing.accept(attemptId);
      vr.say('Got it. Check your messages for the lead details. Goodbye.');
    } else if (digits === '2') {
      await this.routing.decline(attemptId);
      vr.say('No problem. Passing this lead to the next rep. Goodbye.');
    } else {
      await this.routing.noResponse(attemptId, 'timeout');
      vr.say('No selection received. Goodbye.');
    }
    vr.hangup();
    return vr.toString();
  }

  /** Final call status callback — re-routes if the rep never accepted. */
  @Post('status/:attemptId')
  @Header('Content-Type', 'text/xml')
  async status(
    @Param('attemptId') attemptId: string,
    @Body('CallStatus') callStatus?: string,
  ): Promise<string> {
    // `completed` means the call ended (possibly with no keypress) → timeout;
    // anything else (no-answer/busy/failed/canceled) → failed. Both no-op if the
    // attempt was already resolved by a keypress.
    const reason = callStatus === 'completed' ? 'timeout' : 'failed';
    await this.routing.noResponse(attemptId, reason);
    return new VoiceResponse().toString();
  }
}
