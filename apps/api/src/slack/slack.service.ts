import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/config.module';
import { LeadsService } from '../leads/leads.service';
import { BookingService, type SlackBookingConfig } from './booking.service';
import { parseSlackLead } from './booking.util';

const MAX_SKEW_SECONDS = 5 * 60;

interface SlackChannelConfig {
  id: string;
  purpose: 'leads' | 'bookings';
}
interface SlackIntegrationConfig extends SlackBookingConfig {
  teamId: string;
  channels: SlackChannelConfig[];
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly leads: LeadsService,
    private readonly booking: BookingService,
  ) {}

  /** Verify a Slack request signature. Skips when no signing secret is set (dev). */
  verifySignature(rawBody: string, signature?: string, timestamp?: string): boolean {
    const secret = this.config.get('SLACK_SIGNING_SECRET');
    if (!secret) return true;
    if (!signature || !timestamp) return false;

    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) return false;

    const expected = `v0=${createHmac('sha256', secret).update(`v0:${timestamp}:${rawBody}`).digest('hex')}`;
    if (expected.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  /**
   * Handle a Slack Events API payload. Returns the verification challenge for
   * url_verification, otherwise dispatches message events to lead ingest or the
   * booking flow based on the channel's configured purpose.
   */
  async handleEvent(body: Record<string, unknown>): Promise<{ challenge?: string; ok: boolean }> {
    if (body.type === 'url_verification') {
      return { challenge: String(body.challenge ?? ''), ok: true };
    }
    if (body.type !== 'event_callback') return { ok: true };

    const teamId = String(body.team_id ?? '');
    const event = body.event as
      | { type?: string; subtype?: string; channel?: string; text?: string; ts?: string }
      | undefined;

    if (!event || event.type !== 'message' || !event.text || !event.channel || !event.ts) {
      return { ok: true };
    }
    // Ignore edits/deletions.
    if (event.subtype === 'message_changed' || event.subtype === 'message_deleted') return { ok: true };

    const integration = await this.prisma.integration.findFirst({
      where: { type: 'slack', status: 'active', config: { path: ['teamId'], equals: teamId } },
    });
    if (!integration) return { ok: true };

    const config = integration.config as unknown as SlackIntegrationConfig;
    const channel = config.channels?.find((c) => c.id === event.channel);
    if (!channel) return { ok: true };

    if (channel.purpose === 'leads') {
      await this.leads.ingest(
        { orgId: integration.orgId, integrationId: integration.id, source: 'slack' },
        parseSlackLead(event.text, event.ts),
      );
    } else {
      await this.booking.handle(integration.orgId, config, { text: event.text, ts: event.ts });
    }
    return { ok: true };
  }
}
