import { EventType } from '@leadarrow/shared';
import { RoutingService } from './routing.service';

/** Builds a RoutingService wired to fully-mocked collaborators. */
function makeService() {
  const prisma = {
    lead: { findUnique: jest.fn(), updateMany: jest.fn() },
    leadAttempt: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    organization: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
  };
  const events = { record: jest.fn().mockResolvedValue(undefined) };
  const reps = { findEligibleNow: jest.fn() };
  const config = {
    get: jest.fn((key: string) =>
      key === 'API_PUBLIC_URL' ? 'http://api' : key === 'RING_TIMEOUT_SECONDS' ? 25 : undefined,
    ),
  };
  const telephony = {
    ringRep: jest.fn().mockResolvedValue({ callId: 'CALL' }),
    sendSms: jest.fn().mockResolvedValue(undefined),
    cancelCall: jest.fn().mockResolvedValue(undefined),
    isConfigured: jest.fn().mockReturnValue(true),
  };
  const realtime = {
    isOnline: jest.fn().mockReturnValue(false),
    ringRep: jest.fn(),
    resolve: jest.fn(),
    openCrm: jest.fn(),
  };
  const pushover = {
    isConfigured: jest.fn().mockReturnValue(false),
    notify: jest.fn().mockResolvedValue(undefined),
  };
  const attemptTimeout = { schedule: jest.fn().mockResolvedValue(undefined) };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const service = new RoutingService(
    prisma as any,
    events as any,
    reps as any,
    config as any,
    telephony as any,
    realtime as any,
    pushover as any,
    attemptTimeout as any,
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return { service, prisma, events, reps, telephony, realtime, pushover, attemptTimeout };
}

const rep = (id: string, routingPercent: number | null = null) => ({
  id,
  phone: `+1${id}`,
  routingPercent,
});

describe('RoutingService', () => {
  describe('routeLead → first attempt', () => {
    it('claims the lead and rings the first eligible rep (round-robin)', async () => {
      const { service, prisma, events, reps, telephony } = makeService();
      prisma.lead.findUnique
        .mockResolvedValueOnce({ id: 'L', orgId: 'O', status: 'received' })
        .mockResolvedValueOnce({ id: 'L', orgId: 'O', status: 'routing', name: 'Acme' });
      prisma.lead.updateMany.mockResolvedValue({ count: 1 });
      prisma.leadAttempt.findMany.mockResolvedValue([]);
      reps.findEligibleNow.mockResolvedValue([rep('R1'), rep('R2')]);
      prisma.organization.findUniqueOrThrow.mockResolvedValue({ routingMethod: 'round_robin' });
      prisma.organization.update.mockResolvedValue({ roundRobinCursor: 1 });
      prisma.leadAttempt.create.mockResolvedValue({ id: 'A1' });

      await service.routeLead('L');

      expect(telephony.ringRep).toHaveBeenCalledWith(
        expect.objectContaining({ to: '+1R1', answerUrl: 'http://api/v1/telephony/voice/A1' }),
      );
      expect(events.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: EventType.LeadRoutingStarted }),
      );
      expect(events.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: EventType.AlertSent, repId: 'R1' }),
      );
      expect(prisma.leadAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { providerCallId: 'CALL' } }),
      );
    });

    it('schedules a backstop timeout for the attempt', async () => {
      const { service, prisma, reps, attemptTimeout } = makeService();
      prisma.lead.findUnique
        .mockResolvedValueOnce({ id: 'L', orgId: 'O', status: 'received' })
        .mockResolvedValueOnce({ id: 'L', orgId: 'O', status: 'routing', name: 'Acme', source: 'close', crmRecordUrl: null });
      prisma.lead.updateMany.mockResolvedValue({ count: 1 });
      prisma.leadAttempt.findMany.mockResolvedValue([]);
      reps.findEligibleNow.mockResolvedValue([rep('R1')]);
      prisma.organization.findUniqueOrThrow.mockResolvedValue({ routingMethod: 'round_robin' });
      prisma.organization.update.mockResolvedValue({ roundRobinCursor: 1 });
      prisma.leadAttempt.create.mockResolvedValue({ id: 'A1' });

      await service.routeLead('L');

      // RING_TIMEOUT_SECONDS (25) + 10s buffer = 35_000ms.
      expect(attemptTimeout.schedule).toHaveBeenCalledWith('A1', 35_000);
    });

    it('does nothing if the lead is already being routed (claim loses the race)', async () => {
      const { service, prisma, telephony } = makeService();
      prisma.lead.findUnique.mockResolvedValueOnce({ id: 'L', orgId: 'O', status: 'received' });
      prisma.lead.updateMany.mockResolvedValue({ count: 0 }); // someone else claimed it

      await service.routeLead('L');

      expect(telephony.ringRep).not.toHaveBeenCalled();
    });

    it('dead-ends when no reps are eligible', async () => {
      const { service, prisma, events, reps, telephony } = makeService();
      prisma.lead.findUnique
        .mockResolvedValueOnce({ id: 'L', orgId: 'O', status: 'received' })
        .mockResolvedValueOnce({ id: 'L', orgId: 'O', status: 'routing', name: 'Acme' });
      prisma.lead.updateMany.mockResolvedValue({ count: 1 });
      prisma.leadAttempt.findMany.mockResolvedValue([]);
      reps.findEligibleNow.mockResolvedValue([]);

      await service.routeLead('L');

      expect(telephony.ringRep).not.toHaveBeenCalled();
      expect(events.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: EventType.LeadDeadEnd }),
      );
    });
  });

  describe('accept', () => {
    it('marks the lead accepted, texts the CRM link, and emits events', async () => {
      const { service, prisma, events, telephony } = makeService();
      prisma.leadAttempt.updateMany.mockResolvedValue({ count: 1 }); // claim wins
      prisma.leadAttempt.findUnique.mockResolvedValue({
        id: 'A1',
        orgId: 'O',
        leadId: 'L',
        repId: 'R1',
        outcome: 'accepted',
        rep: { phone: '+1R1' },
        lead: { name: 'Acme', crmRecordUrl: 'http://crm/1' },
      });
      prisma.lead.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.accept('A1');

      expect(result).toEqual({ accepted: true, leadName: 'Acme' });
      expect(telephony.sendSms).toHaveBeenCalledWith('+1R1', expect.stringContaining('http://crm/1'));
      expect(events.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: EventType.LeadAccepted, repId: 'R1' }),
      );
    });

    it('is idempotent for a duplicate press (claim loses)', async () => {
      const { service, prisma, events, telephony } = makeService();
      prisma.leadAttempt.updateMany.mockResolvedValue({ count: 0 }); // already resolved
      prisma.leadAttempt.findUnique.mockResolvedValue({
        id: 'A1',
        outcome: 'accepted',
        leadId: 'L',
        rep: { phone: '+1R1' },
        lead: { name: 'Acme', crmRecordUrl: null },
      });

      const result = await service.accept('A1');

      expect(result.accepted).toBe(true);
      expect(telephony.sendSms).not.toHaveBeenCalled();
      expect(events.record).not.toHaveBeenCalled();
    });
  });

  describe('decline → re-route', () => {
    it('declines and rings the next eligible rep, excluding the one who declined', async () => {
      const { service, prisma, events, reps, telephony } = makeService();
      prisma.leadAttempt.updateMany.mockResolvedValue({ count: 1 });
      prisma.leadAttempt.findUnique.mockResolvedValue({
        id: 'A1',
        orgId: 'O',
        leadId: 'L',
        repId: 'R1',
        outcome: 'declined',
        rep: { phone: '+1R1' },
        lead: { name: 'Acme', crmRecordUrl: null },
      });
      // attemptNext:
      prisma.lead.findUnique.mockResolvedValue({ id: 'L', orgId: 'O', status: 'routing', name: 'Acme' });
      prisma.leadAttempt.findMany.mockResolvedValue([{ repId: 'R1' }]);
      reps.findEligibleNow.mockResolvedValue([rep('R2')]);
      prisma.organization.findUniqueOrThrow.mockResolvedValue({ routingMethod: 'round_robin' });
      prisma.organization.update.mockResolvedValue({ roundRobinCursor: 2 });
      prisma.leadAttempt.create.mockResolvedValue({ id: 'A2' });

      await service.decline('A1');

      expect(reps.findEligibleNow).toHaveBeenCalledWith('O', ['R1']);
      expect(telephony.ringRep).toHaveBeenCalledWith(expect.objectContaining({ to: '+1R2' }));
      expect(events.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: EventType.LeadRerouted }),
      );
    });

    it('no-ops when the decline claim loses (already handled)', async () => {
      const { service, prisma, telephony } = makeService();
      prisma.leadAttempt.updateMany.mockResolvedValue({ count: 0 });

      await service.decline('A1');

      expect(telephony.ringRep).not.toHaveBeenCalled();
    });
  });

  describe('percentage routing', () => {
    it('honours weights — a 0-weight rep is skipped in favour of a weighted one', async () => {
      const { service, prisma, reps, telephony } = makeService();
      prisma.lead.findUnique
        .mockResolvedValueOnce({ id: 'L', orgId: 'O', status: 'received' })
        .mockResolvedValueOnce({ id: 'L', orgId: 'O', status: 'routing', name: 'Acme' });
      prisma.lead.updateMany.mockResolvedValue({ count: 1 });
      prisma.leadAttempt.findMany.mockResolvedValue([]);
      reps.findEligibleNow.mockResolvedValue([rep('R1', 0), rep('R2', 100)]);
      prisma.organization.findUniqueOrThrow.mockResolvedValue({ routingMethod: 'percentage' });
      prisma.leadAttempt.create.mockResolvedValue({ id: 'A1' });

      await service.routeLead('L');

      expect(telephony.ringRep).toHaveBeenCalledWith(expect.objectContaining({ to: '+1R2' }));
    });
  });

  describe('multi-channel ring', () => {
    function setupRing(extra: Record<string, unknown> = {}) {
      const ctx = makeService();
      ctx.prisma.lead.findUnique
        .mockResolvedValueOnce({ id: 'L', orgId: 'O', status: 'received' })
        .mockResolvedValueOnce({
          id: 'L',
          orgId: 'O',
          status: 'routing',
          name: 'Acme',
          source: 'close',
          crmRecordUrl: 'http://crm/1',
        });
      ctx.prisma.lead.updateMany.mockResolvedValue({ count: 1 });
      ctx.prisma.leadAttempt.findMany.mockResolvedValue([]);
      ctx.reps.findEligibleNow.mockResolvedValue([{ id: 'R1', phone: '+1R1', routingPercent: null, ...extra }]);
      ctx.prisma.organization.findUniqueOrThrow.mockResolvedValue({ routingMethod: 'round_robin' });
      ctx.prisma.organization.update.mockResolvedValue({ roundRobinCursor: 1 });
      ctx.prisma.leadAttempt.create.mockResolvedValue({ id: 'A1' });
      return ctx;
    }

    it('rings the browser extension when the rep is online', async () => {
      const { service, realtime, telephony } = setupRing();
      realtime.isOnline.mockReturnValue(true);

      await service.routeLead('L');

      expect(telephony.ringRep).toHaveBeenCalled();
      expect(realtime.ringRep).toHaveBeenCalledWith(
        'R1',
        expect.objectContaining({ attemptId: 'A1', leadId: 'L', name: 'Acme', source: 'close', crmUrl: 'http://crm/1' }),
      );
    });

    it('sends a Pushover alert when the rep has a key and Pushover is configured', async () => {
      const { service, pushover } = setupRing({ pushoverUserKey: 'uKEY' });
      pushover.isConfigured.mockReturnValue(true);

      await service.routeLead('L');

      expect(pushover.notify).toHaveBeenCalledWith('uKEY', 'New lead', expect.stringContaining('Acme'));
    });
  });

  describe('cross-channel accept/decline', () => {
    const attempt = {
      id: 'A1',
      orgId: 'O',
      leadId: 'L',
      repId: 'R1',
      outcome: 'accepted',
      providerCallId: 'CALL',
      rep: { phone: '+1R1' },
      lead: { name: 'Acme', crmRecordUrl: 'http://crm/1' },
    };

    it('extension accept opens the CRM, cancels the phone, and skips SMS', async () => {
      const { service, prisma, telephony, realtime } = makeService();
      prisma.leadAttempt.updateMany.mockResolvedValue({ count: 1 });
      prisma.leadAttempt.findUnique.mockResolvedValue(attempt);
      prisma.lead.updateMany.mockResolvedValue({ count: 1 });

      const res = await service.accept('A1', 'extension');

      expect(res.accepted).toBe(true);
      expect(realtime.openCrm).toHaveBeenCalledWith('R1', 'http://crm/1');
      expect(telephony.cancelCall).toHaveBeenCalledWith('CALL');
      expect(telephony.sendSms).not.toHaveBeenCalled();
      expect(realtime.resolve).toHaveBeenCalledWith('R1', 'A1');
    });

    it('phone accept texts the link, dismisses the browser, and keeps the call', async () => {
      const { service, prisma, telephony, realtime } = makeService();
      prisma.leadAttempt.updateMany.mockResolvedValue({ count: 1 });
      prisma.leadAttempt.findUnique.mockResolvedValue(attempt);
      prisma.lead.updateMany.mockResolvedValue({ count: 1 });

      await service.accept('A1', 'phone');

      expect(telephony.sendSms).toHaveBeenCalledWith('+1R1', expect.stringContaining('http://crm/1'));
      expect(telephony.cancelCall).not.toHaveBeenCalled();
      expect(realtime.openCrm).not.toHaveBeenCalled();
      expect(realtime.resolve).toHaveBeenCalledWith('R1', 'A1');
    });

    it('does not text a rep who has opted out of SMS', async () => {
      const { service, prisma, telephony } = makeService();
      prisma.leadAttempt.updateMany.mockResolvedValue({ count: 1 });
      prisma.leadAttempt.findUnique.mockResolvedValue({ ...attempt, rep: { phone: '+1R1', smsOptedOut: true } });
      prisma.lead.updateMany.mockResolvedValue({ count: 1 });

      const res = await service.accept('A1', 'phone');

      expect(res.accepted).toBe(true);
      expect(telephony.sendSms).not.toHaveBeenCalled();
    });
  });
});
