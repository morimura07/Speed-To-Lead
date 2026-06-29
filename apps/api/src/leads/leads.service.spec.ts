import { Test } from '@nestjs/testing';
import { EventType } from '@leadarrow/shared';
import { LeadsService } from './leads.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { LEAD_DISPATCHER, type LeadDispatcher } from '../queue/queue.constants';
import type { NormalizedLead } from '../ingestion/adapters/crm-adapter';

const CTX = { orgId: 'org_1', integrationId: 'int_1', source: 'close' };
const LEAD: NormalizedLead = {
  externalId: 'lead_1',
  name: 'Acme Corp',
  email: 'jane@acme.com',
  phone: '+15550001111',
  crmRecordUrl: 'https://app.close.com/lead/lead_1/',
  raw: { ok: true },
};

describe('LeadsService.ingest', () => {
  let service: LeadsService;
  let prisma: {
    lead: { findUnique: jest.Mock; create: jest.Mock };
  };
  let events: { record: jest.Mock };
  let dispatcher: { dispatch: jest.Mock };

  beforeEach(async () => {
    prisma = {
      lead: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    events = { record: jest.fn().mockResolvedValue(undefined) };
    dispatcher = { dispatch: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsService, useValue: events },
        { provide: LEAD_DISPATCHER, useValue: dispatcher as LeadDispatcher },
      ],
    }).compile();

    service = moduleRef.get(LeadsService);
  });

  it('persists, emits lead.received, and dispatches a new lead', async () => {
    prisma.lead.findUnique.mockResolvedValue(null);
    prisma.lead.create.mockResolvedValue({ id: 'db_1' });

    const result = await service.ingest(CTX, LEAD);

    expect(result).toEqual({ id: 'db_1', created: true });
    expect(prisma.lead.create).toHaveBeenCalledTimes(1);
    expect(events.record).toHaveBeenCalledWith(
      expect.objectContaining({ type: EventType.LeadReceived, leadId: 'db_1', orgId: 'org_1' }),
    );
    expect(dispatcher.dispatch).toHaveBeenCalledWith({ leadId: 'db_1', orgId: 'org_1' });
  });

  it('is idempotent for a duplicate (orgId, source, externalId)', async () => {
    prisma.lead.findUnique.mockResolvedValue({ id: 'db_existing' });

    const result = await service.ingest(CTX, LEAD);

    expect(result).toEqual({ id: 'db_existing', created: false });
    expect(prisma.lead.create).not.toHaveBeenCalled();
    expect(events.record).not.toHaveBeenCalled();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });
});
