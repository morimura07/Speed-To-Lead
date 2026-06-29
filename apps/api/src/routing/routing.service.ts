import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Rep, RoutingMethod } from '@prisma/client';
import { EventType } from '@leadarrow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { AppConfigService } from '../config/config.module';
import { RepsService } from '../reps/reps.service';
import { TELEPHONY_PROVIDER, type TelephonyProvider } from '../telephony/telephony.types';
import { REALTIME_NOTIFIER, type RealtimeNotifier } from '../realtime/realtime.types';
import { PushoverService } from '../notifications/pushover.service';

type AcceptVia = 'phone' | 'extension';

/**
 * The routing engine — a state machine that drives a lead from arrival to a rep
 * accepting it (or a dead end). Flow:
 *
 *   routeLead → attemptNext → ring a rep → (accept | decline | timeout | fail)
 *                   ↑__________ re-route ___________|        |
 *                                                            ↓
 *                                                        dead end
 *
 * Idempotency is enforced by atomically claiming an attempt's `outcome`
 * transition (ringing → X): duplicate Twilio webhooks lose the race and no-op.
 */
@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly reps: RepsService,
    private readonly config: AppConfigService,
    @Inject(TELEPHONY_PROVIDER) private readonly telephony: TelephonyProvider,
    @Inject(REALTIME_NOTIFIER) private readonly realtime: RealtimeNotifier,
    private readonly pushover: PushoverService,
  ) {}

  /** Entry point from the routing worker. */
  async routeLead(leadId: string): Promise<void> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, orgId: true, status: true },
    });
    if (!lead) {
      this.logger.warn(`routeLead: lead ${leadId} not found`);
      return;
    }

    // Atomically claim the lead for routing; a retry/duplicate finds count 0.
    const claimed = await this.prisma.lead.updateMany({
      where: { id: leadId, status: 'received' },
      data: { status: 'routing' },
    });
    if (claimed.count !== 1) {
      this.logger.debug(`routeLead: lead ${leadId} already being routed`);
      return;
    }

    await this.events.record({
      orgId: lead.orgId,
      type: EventType.LeadRoutingStarted,
      leadId,
    });
    await this.attemptNext(leadId);
  }

  /** Ring the next eligible rep, or dead-end when none remain. */
  async attemptNext(leadId: string): Promise<void> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, orgId: true, status: true, name: true, source: true, crmRecordUrl: true },
    });
    if (!lead || lead.status !== 'routing') return; // accepted or dead-ended already

    const tried = await this.prisma.leadAttempt.findMany({
      where: { leadId },
      select: { repId: true },
    });
    const eligible = await this.reps.findEligibleNow(
      lead.orgId,
      tried.map((t) => t.repId),
    );

    if (eligible.length === 0) {
      await this.deadEnd(lead.id, lead.orgId);
      return;
    }

    const rep = await this.selectRep(lead.orgId, eligible);
    await this.ring(lead, rep);
  }

  /**
   * Ring a rep across every available channel simultaneously — phone, browser
   * softphone, and Pushover. The phone call's status callback drives the ring
   * timeout; the browser is a parallel accept path. Whichever channel the rep
   * acts on first wins (atomic attempt claim), and the others are cancelled.
   */
  private async ring(
    lead: { id: string; orgId: string; name: string; source: string; crmRecordUrl: string | null },
    rep: Rep,
  ): Promise<void> {
    const attempt = await this.prisma.leadAttempt.create({
      data: { orgId: lead.orgId, leadId: lead.id, repId: rep.id, channel: 'phone' },
      select: { id: true },
    });

    const channels: string[] = [];

    // Phone (also provides the ring timeout via the status callback).
    if (this.telephony.isConfigured()) {
      const base = `${this.config.get('API_PUBLIC_URL')}/v1/telephony`;
      try {
        const { callId } = await this.telephony.ringRep({
          to: rep.phone,
          answerUrl: `${base}/voice/${attempt.id}`,
          statusCallbackUrl: `${base}/status/${attempt.id}`,
          timeoutSeconds: this.config.get('RING_TIMEOUT_SECONDS'),
        });
        await this.prisma.leadAttempt.update({
          where: { id: attempt.id },
          data: { providerCallId: callId },
        });
        channels.push('phone');
      } catch (err) {
        this.logger.error(`Failed to place call to rep ${rep.id}: ${String(err)}`);
      }
    }

    // Browser softphone (only if the rep has a connected extension).
    if (this.realtime.isOnline(rep.id)) {
      this.realtime.ringRep(rep.id, {
        attemptId: attempt.id,
        leadId: lead.id,
        name: lead.name,
        source: lead.source,
        crmUrl: lead.crmRecordUrl,
      });
      channels.push('extension');
    }

    // Pushover emergency alert (optional).
    if (rep.pushoverUserKey && this.pushover.isConfigured()) {
      await this.pushover.notify(rep.pushoverUserKey, 'New lead', `${lead.name} from ${lead.source}`);
      channels.push('pushover');
    }

    if (channels.length === 0) {
      // No channel could reach this rep — record the failure and move on.
      await this.prisma.leadAttempt.updateMany({
        where: { id: attempt.id, outcome: 'ringing' },
        data: { outcome: 'failed', completedAt: new Date() },
      });
      await this.events.record({
        orgId: lead.orgId,
        type: EventType.AlertFailed,
        leadId: lead.id,
        repId: rep.id,
        payload: { attemptId: attempt.id, reason: 'no_channel' },
      });
      await this.attemptNext(lead.id);
      return;
    }

    await this.events.record({
      orgId: lead.orgId,
      type: EventType.AlertSent,
      leadId: lead.id,
      repId: rep.id,
      payload: { attemptId: attempt.id, channels },
    });
    this.logger.log(`Ringing rep ${rep.id} via ${channels.join('+')} for lead ${lead.id}`);
  }

  // ── Inbound transitions (driven by telephony webhooks) ──────────────────────

  /** Rep accepted (phone press 1, or extension button). */
  async accept(
    attemptId: string,
    via: AcceptVia = 'phone',
  ): Promise<{ accepted: boolean; leadName?: string }> {
    const claimed = await this.claim(attemptId, 'accepted', { answered: true });
    const attempt = await this.loadAttempt(attemptId);
    if (!attempt) return { accepted: false };

    if (!claimed) {
      // Already resolved — idempotent for a duplicate accept on any channel.
      return { accepted: attempt.outcome === 'accepted', leadName: attempt.lead.name };
    }

    const leadClaimed = await this.prisma.lead.updateMany({
      where: { id: attempt.leadId, status: { in: ['received', 'routing'] } },
      data: { status: 'accepted', acceptedById: attempt.repId },
    });

    await this.events.record({
      orgId: attempt.orgId,
      type: EventType.AlertAnswered,
      leadId: attempt.leadId,
      repId: attempt.repId,
      payload: { attemptId, via },
    });

    if (leadClaimed.count === 1) {
      await this.events.record({
        orgId: attempt.orgId,
        type: EventType.LeadAccepted,
        leadId: attempt.leadId,
        repId: attempt.repId,
        payload: { attemptId, via },
      });
      // Extension accept opens the CRM record in the browser; phone accept texts a link.
      if (via === 'extension') {
        this.realtime.openCrm(attempt.repId, attempt.lead.crmRecordUrl ?? '');
      } else {
        await this.sendCrmLink(attempt.rep.phone, attempt.lead.name, attempt.lead.crmRecordUrl);
      }
    }

    await this.cancelOtherChannels(attempt, via);
    return { accepted: true, leadName: attempt.lead.name };
  }

  /** Rep declined (phone press 2, or extension button) — re-route. */
  async decline(attemptId: string, via: AcceptVia = 'phone'): Promise<void> {
    if (!(await this.claim(attemptId, 'declined', { answered: true }))) return;
    const attempt = await this.loadAttempt(attemptId);
    if (!attempt) return;

    await this.events.record({
      orgId: attempt.orgId,
      type: EventType.AlertDeclined,
      leadId: attempt.leadId,
      repId: attempt.repId,
      payload: { attemptId, via },
    });
    await this.events.record({
      orgId: attempt.orgId,
      type: EventType.LeadRerouted,
      leadId: attempt.leadId,
      repId: attempt.repId,
      payload: { attemptId, reason: 'declined' },
    });
    await this.cancelOtherChannels(attempt, via);
    await this.attemptNext(attempt.leadId);
  }

  /** No key press (gather timeout) or the call ended/failed without acceptance. */
  async noResponse(attemptId: string, reason: 'timeout' | 'failed'): Promise<void> {
    const outcome = reason === 'timeout' ? 'timed_out' : 'failed';
    if (!(await this.claim(attemptId, outcome, { answered: reason === 'timeout' }))) return;
    const attempt = await this.loadAttempt(attemptId);
    if (!attempt) return;

    await this.events.record({
      orgId: attempt.orgId,
      type: reason === 'timeout' ? EventType.LeadTimedOut : EventType.AlertFailed,
      leadId: attempt.leadId,
      repId: attempt.repId,
      payload: { attemptId, reason },
    });
    // Dismiss the browser softphone if it was ringing.
    this.realtime.resolve(attempt.repId, attemptId);
    await this.attemptNext(attempt.leadId);
  }

  /** When one channel resolves an attempt, stop the others. */
  private async cancelOtherChannels(
    attempt: { id: string; repId: string; providerCallId: string | null },
    via: AcceptVia,
  ): Promise<void> {
    // If the rep acted in the browser, hang up the (still-ringing) phone call.
    if (via !== 'phone' && attempt.providerCallId) {
      await this.telephony.cancelCall(attempt.providerCallId);
    }
    // Always dismiss the browser softphone for this attempt.
    this.realtime.resolve(attempt.repId, attempt.id);
  }

  /** Prompt details for the IVR ("New lead {name} from {source}"). */
  async getPrompt(attemptId: string): Promise<{ name: string; source: string } | null> {
    const attempt = await this.prisma.leadAttempt.findUnique({
      where: { id: attemptId },
      select: { lead: { select: { name: true, source: true } } },
    });
    return attempt ? attempt.lead : null;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async deadEnd(leadId: string, orgId: string): Promise<void> {
    const ended = await this.prisma.lead.updateMany({
      where: { id: leadId, status: 'routing' },
      data: { status: 'dead_end' },
    });
    if (ended.count === 1) {
      await this.events.record({ orgId, type: EventType.LeadDeadEnd, leadId });
      this.logger.warn(`Lead ${leadId} dead-ended (no eligible reps)`);
    }
  }

  /** Atomically transition an attempt out of `ringing`. Returns true if this call won. */
  private async claim(
    attemptId: string,
    outcome: 'accepted' | 'declined' | 'timed_out' | 'failed',
    opts: { answered: boolean },
  ): Promise<boolean> {
    const now = new Date();
    const result = await this.prisma.leadAttempt.updateMany({
      where: { id: attemptId, outcome: 'ringing' },
      data: { outcome, completedAt: now, ...(opts.answered ? { answeredAt: now } : {}) },
    });
    return result.count === 1;
  }

  private loadAttempt(attemptId: string) {
    return this.prisma.leadAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        orgId: true,
        leadId: true,
        repId: true,
        outcome: true,
        providerCallId: true,
        rep: { select: { phone: true } },
        lead: { select: { name: true, crmRecordUrl: true } },
      },
    });
  }

  private async sendCrmLink(
    phone: string,
    leadName: string,
    crmUrl: string | null,
  ): Promise<void> {
    const body = crmUrl
      ? `LeadArrow: you accepted ${leadName}. Open the record: ${crmUrl}`
      : `LeadArrow: you accepted ${leadName}.`;
    try {
      await this.telephony.sendSms(phone, body);
    } catch (err) {
      this.logger.warn(`Failed to SMS CRM link to ${phone}: ${String(err)}`);
    }
  }

  /** Pick a rep from the eligible set per the org's routing method. */
  private async selectRep(orgId: string, eligible: Rep[]): Promise<Rep> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: { routingMethod: true },
    });

    return org.routingMethod === 'percentage'
      ? this.selectByPercentage(eligible)
      : this.selectRoundRobin(orgId, eligible);
  }

  private async selectRoundRobin(orgId: string, eligible: Rep[]): Promise<Rep> {
    // Atomic cursor bump keeps distribution fair under concurrent leads.
    const { roundRobinCursor } = await this.prisma.organization.update({
      where: { id: orgId },
      data: { roundRobinCursor: { increment: 1 } },
      select: { roundRobinCursor: true },
    });
    const index = (roundRobinCursor - 1) % eligible.length;
    return eligible[index];
  }

  private selectByPercentage(eligible: Rep[]): Rep {
    const weights = eligible.map((r) => Math.max(0, r.routingPercent ?? 0));
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return eligible[0]; // no weights configured → deterministic fallback

    let roll = Math.random() * total;
    for (let i = 0; i < eligible.length; i += 1) {
      roll -= weights[i];
      if (roll < 0) return eligible[i];
    }
    return eligible[eligible.length - 1];
  }

  // ── Routing configuration ───────────────────────────────────────────────────

  async getConfig(orgId: string) {
    return this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: { routingMethod: true, timezone: true, calendarBusyCheck: true },
    });
  }

  async setConfig(
    orgId: string,
    patch: { routingMethod?: RoutingMethod; timezone?: string; calendarBusyCheck?: boolean },
  ) {
    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(patch.routingMethod !== undefined ? { routingMethod: patch.routingMethod } : {}),
        ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
        ...(patch.calendarBusyCheck !== undefined ? { calendarBusyCheck: patch.calendarBusyCheck } : {}),
      },
      select: { routingMethod: true, timezone: true, calendarBusyCheck: true },
    });
  }
}
