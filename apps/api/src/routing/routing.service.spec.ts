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
  const reps = { findEligible: jest.fn() };
  const config = {
    get: jest.fn((key: string) =>
      key === 'API_PUBLIC_URL' ? 'http://api' : key === 'RING_TIMEOUT_SECONDS' ? 25 : undefined,
    ),
  };
  const telephony = {
    ringRep: jest.fn().mockResolvedValue({ callId: 'CALL' }),
    sendSms: jest.fn().mockResolvedValue(undefined),
    cancelCall: jest.fn(),
    isConfigured: jest.fn().mockReturnValue(true),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new RoutingService(prisma as any, events as any, reps as any, config as any, telephony as any);
  return { service, prisma, events, reps, telephony };
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
      reps.findEligible.mockResolvedValue([rep('R1'), rep('R2')]);
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
      reps.findEligible.mockResolvedValue([]);

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
      reps.findEligible.mockResolvedValue([rep('R2')]);
      prisma.organization.findUniqueOrThrow.mockResolvedValue({ routingMethod: 'round_robin' });
      prisma.organization.update.mockResolvedValue({ roundRobinCursor: 2 });
      prisma.leadAttempt.create.mockResolvedValue({ id: 'A2' });

      await service.decline('A1');

      expect(reps.findEligible).toHaveBeenCalledWith('O', ['R1']);
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
      reps.findEligible.mockResolvedValue([rep('R1', 0), rep('R2', 100)]);
      prisma.organization.findUniqueOrThrow.mockResolvedValue({ routingMethod: 'percentage' });
      prisma.leadAttempt.create.mockResolvedValue({ id: 'A1' });

      await service.routeLead('L');

      expect(telephony.ringRep).toHaveBeenCalledWith(expect.objectContaining({ to: '+1R2' }));
    });
  });
});
