import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventType } from '@leadarrow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { LEAD_DISPATCHER, type LeadDispatcher } from '../queue/queue.constants';
import type { NormalizedLead } from '../ingestion/adapters/crm-adapter';

export interface IngestContext {
  orgId: string;
  integrationId: string;
  source: string;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    @Inject(LEAD_DISPATCHER) private readonly dispatcher: LeadDispatcher,
  ) {}

  /**
   * Persist a normalized lead, emit `lead.received`, and enqueue it for routing.
   * Idempotent: a repeated (orgId, source, externalId) — e.g. a webhook retry —
   * returns the existing lead without re-emitting or re-dispatching.
   *
   * @returns `created` = true only on first ingest of this record.
   */
  async ingest(
    ctx: IngestContext,
    lead: NormalizedLead,
  ): Promise<{ id: string; created: boolean }> {
    const existing = await this.prisma.lead.findUnique({
      where: {
        orgId_source_externalId: {
          orgId: ctx.orgId,
          source: ctx.source,
          externalId: lead.externalId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      this.logger.debug(`Duplicate lead ${ctx.source}:${lead.externalId} ignored`);
      return { id: existing.id, created: false };
    }

    const created = await this.prisma.lead.create({
      data: {
        orgId: ctx.orgId,
        integrationId: ctx.integrationId,
        source: ctx.source,
        externalId: lead.externalId,
        name: lead.name,
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        crmRecordUrl: lead.crmRecordUrl ?? null,
        raw: lead.raw as object,
      },
      select: { id: true },
    });

    await this.events.record({
      orgId: ctx.orgId,
      type: EventType.LeadReceived,
      leadId: created.id,
      payload: { source: ctx.source, externalId: lead.externalId, name: lead.name },
    });

    await this.dispatcher.dispatch({ leadId: created.id, orgId: ctx.orgId });

    this.logger.log(`Lead ingested ${ctx.source}:${lead.externalId} -> ${created.id}`);
    return { id: created.id, created: true };
  }

  /** Recent leads for an organization (newest first). */
  async listForOrg(orgId: string, take = 50, skip = 0) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          source: true,
          name: true,
          email: true,
          phone: true,
          crmRecordUrl: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.lead.count({ where: { orgId } }),
    ]);

    return {
      items: items.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
      total,
      take,
      skip,
    };
  }
}
