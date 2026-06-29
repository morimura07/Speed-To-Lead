import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Rep, RoutingMethod } from '@prisma/client';
import { EventType } from '@leadarrow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { AppConfigService } from '../config/config.module';
import { RepsService } from '../reps/reps.service';
import { TELEPHONY_PROVIDER, type TelephonyProvider } from '../telephony/telephony.types';

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
      select: { id: true, orgId: true, status: true, name: true },
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
    await this.ring(lead.id, lead.orgId, lead.name, rep);
  }

  private async ring(leadId: string, orgId: string, leadName: string, rep: Rep): Promise<void> {
    const attempt = await this.prisma.leadAttempt.create({
      data: { orgId, leadId, repId: rep.id, channel: 'phone' },
      select: { id: true },
    });

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
      await this.events.record({
        orgId,
        type: EventType.AlertSent,
        leadId,
        repId: rep.id,
        payload: { attemptId: attempt.id, channel: 'phone' },
      });
      this.logger.log(`Ringing rep ${rep.id} for lead ${leadId} (${leadName})`);
    } catch (err) {
      // Couldn't place the call — record the failure and move to the next rep.
      this.logger.error(`Failed to ring rep ${rep.id}: ${String(err)}`);
      await this.prisma.leadAttempt.updateMany({
        where: { id: attempt.id, outcome: 'ringing' },
        data: { outcome: 'failed', completedAt: new Date() },
      });
      await this.events.record({
        orgId,
        type: EventType.AlertFailed,
        leadId,
        repId: rep.id,
        payload: { attemptId: attempt.id, reason: 'ring_failed' },
      });
      await this.attemptNext(leadId);
    }
  }

  // ── Inbound transitions (driven by telephony webhooks) ──────────────────────

  /** Rep pressed 1. Returns whether the lead is now (or was already) accepted. */
  async accept(attemptId: string): Promise<{ accepted: boolean; leadName?: string }> {
    const claimed = await this.claim(attemptId, 'accepted', { answered: true });
    const attempt = await this.loadAttempt(attemptId);
    if (!attempt) return { accepted: false };

    if (!claimed) {
      // Already resolved — idempotent for a duplicate press.
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
      payload: { attemptId },
    });

    if (leadClaimed.count === 1) {
      await this.events.record({
        orgId: attempt.orgId,
        type: EventType.LeadAccepted,
        leadId: attempt.leadId,
        repId: attempt.repId,
        payload: { attemptId },
      });
      await this.sendCrmLink(attempt.rep.phone, attempt.lead.name, attempt.lead.crmRecordUrl);
    }

    return { accepted: true, leadName: attempt.lead.name };
  }

  /** Rep pressed 2 — decline and re-route. */
  async decline(attemptId: string): Promise<void> {
    if (!(await this.claim(attemptId, 'declined', { answered: true }))) return;
    const attempt = await this.loadAttempt(attemptId);
    if (!attempt) return;

    await this.events.record({
      orgId: attempt.orgId,
      type: EventType.AlertDeclined,
      leadId: attempt.leadId,
      repId: attempt.repId,
      payload: { attemptId },
    });
    await this.events.record({
      orgId: attempt.orgId,
      type: EventType.LeadRerouted,
      leadId: attempt.leadId,
      repId: attempt.repId,
      payload: { attemptId, reason: 'declined' },
    });
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
    await this.attemptNext(attempt.leadId);
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
