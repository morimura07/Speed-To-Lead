import { Injectable } from '@nestjs/common';
import { LeadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { formatDuration, ratePct, roundSeconds, safeDiv, toNumber } from './analytics.util';
import type { AnalyticsFilterDto, LeadsQueryDto } from './dto/analytics-filter.dto';

const DAY_MS = 86_400_000;

// ── Raw row shapes ────────────────────────────────────────────────────────────
interface SpeedRow {
  avg_first_alert: number | null;
  avg_to_accept: number | null;
  under1: number;
  under5: number;
  over5: number;
}
interface SourceRow { source: string; total: number; accepted: number }
interface DayRow { day: string; received: number; accepted: number }
interface RepRow {
  id: string;
  name: string;
  alerts: number;
  accepted: number;
  declined: number;
  timed_out: number;
  failed: number;
  avg_response_sec: number | null;
}
interface RoutingRow { leads: number; dead_ends: number; attempts: number; routed: number }
interface CountRow { n: number }

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveRange(filters: AnalyticsFilterDto): { from: Date; to: Date } {
    const to = filters.to ? new Date(filters.to) : new Date();
    const from = filters.from ? new Date(filters.from) : new Date(to.getTime() - 30 * DAY_MS);
    return { from, to };
  }

  /** Reusable WHERE fragment for raw lead-scoped queries (alias `l`). */
  private leadWhere(orgId: string, from: Date, to: Date, source?: string): Prisma.Sql {
    const sourceFrag = source ? Prisma.sql`AND l."source" = ${source}` : Prisma.empty;
    return Prisma.sql`l."orgId" = ${orgId} AND l."createdAt" BETWEEN ${from} AND ${to} ${sourceFrag}`;
  }

  async summary(orgId: string, filters: AnalyticsFilterDto) {
    const { from, to } = this.resolveRange(filters);
    const where = this.leadWhere(orgId, from, to, filters.source);

    const leadWhereObj: Prisma.LeadWhereInput = {
      orgId,
      createdAt: { gte: from, lte: to },
      ...(filters.source ? { source: filters.source } : {}),
    };

    const [total, accepted, deadEnd, speed, bySource, byDay, reps, routing, reroute, reliability, crmErrors] =
      await Promise.all([
        this.prisma.lead.count({ where: leadWhereObj }),
        this.prisma.lead.count({ where: { ...leadWhereObj, status: 'accepted' } }),
        this.prisma.lead.count({ where: { ...leadWhereObj, status: 'dead_end' } }),
        this.querySpeed(where),
        this.queryBySource(where),
        this.queryByDay(where),
        this.queryReps(orgId, from, to),
        this.queryRouting(where),
        this.queryReroute(where),
        this.queryReliability(where),
        this.prisma.event.count({
          where: { orgId, type: 'crm.sync_failed', occurredAt: { gte: from, lte: to } },
        }),
      ]);

    const inProgress = Math.max(0, total - accepted - deadEnd);
    const routed = routing.routed;

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      kpis: {
        totalLeads: total,
        accepted,
        deadEnd,
        inProgress,
        connectionRatePct: ratePct(accepted, total),
        avgTimeToAcceptSec: roundSeconds(speed.avg_to_accept),
        avgTimeToFirstAlertSec: roundSeconds(speed.avg_first_alert),
      },
      speed: {
        avgTimeToFirstAlertSec: roundSeconds(speed.avg_first_alert),
        avgTimeToAcceptSec: roundSeconds(speed.avg_to_accept),
        responseWindows: [
          { label: '< 1 min', count: speed.under1 },
          { label: '1–5 min', count: speed.under5 },
          { label: '> 5 min', count: speed.over5 },
        ],
      },
      volume: {
        bySource: bySource.map((r) => ({
          source: r.source,
          total: r.total,
          accepted: r.accepted,
          connectionRatePct: ratePct(r.accepted, r.total),
        })),
        byDay: byDay.map((r) => ({ day: r.day, received: r.received, accepted: r.accepted })),
      },
      reps: reps.map((r) => {
        const answered = r.accepted + r.declined + r.timed_out;
        return {
          id: r.id,
          name: r.name,
          alerts: r.alerts,
          accepted: r.accepted,
          declined: r.declined,
          timedOut: r.timed_out,
          missed: r.failed,
          pickupRatePct: ratePct(answered, r.alerts),
          acceptanceRatePct: ratePct(r.accepted, r.alerts),
          avgResponseSec: roundSeconds(r.avg_response_sec),
        };
      }),
      routingHealth: {
        avgAttemptsPerLead: Math.round(safeDiv(routing.attempts, routed) * 10) / 10,
        deadEndRatePct: ratePct(routing.dead_ends, routing.leads),
        rerouteRatePct: ratePct(reroute, routed),
      },
      reliability: {
        ringFailureRatePct: ratePct(reliability.failed, reliability.total),
        ringFailures: reliability.failed,
        totalRings: reliability.total,
        crmSyncErrors: crmErrors,
        // Pushover + routing-lag metrics arrive with Phases 4 and later.
      },
    };
  }

  // ── Raw queries ─────────────────────────────────────────────────────────────

  private async querySpeed(where: Prisma.Sql): Promise<SpeedRow> {
    const rows = await this.prisma.$queryRaw<SpeedRow[]>(Prisma.sql`
      SELECT
        avg(first_alert_sec)::float AS avg_first_alert,
        avg(accept_sec)::float AS avg_to_accept,
        count(*) FILTER (WHERE accept_sec IS NOT NULL AND accept_sec < 60)::int AS under1,
        count(*) FILTER (WHERE accept_sec >= 60 AND accept_sec < 300)::int AS under5,
        count(*) FILTER (WHERE accept_sec >= 300)::int AS over5
      FROM (
        SELECT l.id,
          extract(epoch FROM (min(e."occurredAt") FILTER (WHERE e.type = 'alert.sent') - l."createdAt")) AS first_alert_sec,
          extract(epoch FROM (min(e."occurredAt") FILTER (WHERE e.type = 'lead.accepted') - l."createdAt")) AS accept_sec
        FROM "leads" l
        LEFT JOIN "events" e ON e."leadId" = l.id
        WHERE ${where}
        GROUP BY l.id
      ) t
    `);
    return rows[0] ?? { avg_first_alert: null, avg_to_accept: null, under1: 0, under5: 0, over5: 0 };
  }

  private queryBySource(where: Prisma.Sql): Promise<SourceRow[]> {
    return this.prisma.$queryRaw<SourceRow[]>(Prisma.sql`
      SELECT l."source" AS source,
        count(*)::int AS total,
        count(*) FILTER (WHERE l.status = 'accepted')::int AS accepted
      FROM "leads" l
      WHERE ${where}
      GROUP BY l."source"
      ORDER BY total DESC
    `);
  }

  private queryByDay(where: Prisma.Sql): Promise<DayRow[]> {
    return this.prisma.$queryRaw<DayRow[]>(Prisma.sql`
      SELECT to_char(date_trunc('day', l."createdAt"), 'YYYY-MM-DD') AS day,
        count(*)::int AS received,
        count(*) FILTER (WHERE l.status = 'accepted')::int AS accepted
      FROM "leads" l
      WHERE ${where}
      GROUP BY 1
      ORDER BY 1
    `);
  }

  private queryReps(orgId: string, from: Date, to: Date): Promise<RepRow[]> {
    return this.prisma.$queryRaw<RepRow[]>(Prisma.sql`
      SELECT r.id, r.name,
        count(a.id)::int AS alerts,
        count(*) FILTER (WHERE a.outcome = 'accepted')::int AS accepted,
        count(*) FILTER (WHERE a.outcome = 'declined')::int AS declined,
        count(*) FILTER (WHERE a.outcome = 'timed_out')::int AS timed_out,
        count(*) FILTER (WHERE a.outcome = 'failed')::int AS failed,
        avg(extract(epoch FROM (a."answeredAt" - a."createdAt"))) FILTER (WHERE a."answeredAt" IS NOT NULL)::float AS avg_response_sec
      FROM "reps" r
      LEFT JOIN "lead_attempts" a
        ON a."repId" = r.id AND a."createdAt" BETWEEN ${from} AND ${to}
      WHERE r."orgId" = ${orgId}
      GROUP BY r.id, r.name
      ORDER BY accepted DESC, alerts DESC
    `);
  }

  private async queryRouting(where: Prisma.Sql): Promise<RoutingRow> {
    const rows = await this.prisma.$queryRaw<RoutingRow[]>(Prisma.sql`
      SELECT
        count(DISTINCT l.id)::int AS leads,
        count(DISTINCT l.id) FILTER (WHERE l.status = 'dead_end')::int AS dead_ends,
        count(a.id)::int AS attempts,
        count(DISTINCT l.id) FILTER (WHERE l.status IN ('routing', 'accepted', 'dead_end'))::int AS routed
      FROM "leads" l
      LEFT JOIN "lead_attempts" a ON a."leadId" = l.id
      WHERE ${where}
    `);
    return rows[0] ?? { leads: 0, dead_ends: 0, attempts: 0, routed: 0 };
  }

  private async queryReroute(where: Prisma.Sql): Promise<number> {
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT count(*)::int AS n FROM (
        SELECT a."leadId"
        FROM "lead_attempts" a
        JOIN "leads" l ON l.id = a."leadId"
        WHERE ${where}
        GROUP BY a."leadId"
        HAVING count(*) > 1
      ) t
    `);
    return toNumber(rows[0]?.n);
  }

  private async queryReliability(where: Prisma.Sql): Promise<{ failed: number; total: number }> {
    const rows = await this.prisma.$queryRaw<{ failed: number; total: number }[]>(Prisma.sql`
      SELECT
        count(*) FILTER (WHERE a.outcome = 'failed')::int AS failed,
        count(a.id)::int AS total
      FROM "lead_attempts" a
      JOIN "leads" l ON l.id = a."leadId"
      WHERE ${where}
    `);
    return rows[0] ?? { failed: 0, total: 0 };
  }

  // ── Drill-down ────────────────────────────────────────────────────────────

  async listLeads(orgId: string, filters: LeadsQueryDto) {
    const { from, to } = this.resolveRange(filters);
    const take = Math.min(Math.max(Number(filters.take) || 50, 1), 200);
    const skip = Math.max(Number(filters.skip) || 0, 0);

    const statusFilter: Prisma.LeadWhereInput =
      filters.outcome === 'in_progress'
        ? { status: { in: [LeadStatus.received, LeadStatus.routing] } }
        : filters.outcome === 'accepted'
          ? { status: LeadStatus.accepted }
          : filters.outcome === 'dead_end'
            ? { status: LeadStatus.dead_end }
            : {};

    const where: Prisma.LeadWhereInput = {
      orgId,
      createdAt: { gte: from, lte: to },
      ...(filters.source ? { source: filters.source } : {}),
      ...statusFilter,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          name: true,
          source: true,
          status: true,
          createdAt: true,
          _count: { select: { attempts: true } },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      items: items.map((l) => ({
        id: l.id,
        name: l.name,
        source: l.source,
        status: l.status,
        attempts: l._count.attempts,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
      take,
      skip,
    };
  }

  async leadDetail(orgId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, orgId },
      select: {
        id: true,
        name: true,
        source: true,
        status: true,
        email: true,
        phone: true,
        crmRecordUrl: true,
        createdAt: true,
        acceptedById: true,
        attempts: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            outcome: true,
            channel: true,
            createdAt: true,
            answeredAt: true,
            completedAt: true,
            rep: { select: { name: true } },
          },
        },
      },
    });

    if (!lead) return null;

    return {
      ...lead,
      createdAt: lead.createdAt.toISOString(),
      attempts: lead.attempts.map((a) => ({
        id: a.id,
        rep: a.rep.name,
        outcome: a.outcome,
        channel: a.channel,
        createdAt: a.createdAt.toISOString(),
        answeredAt: a.answeredAt?.toISOString() ?? null,
        completedAt: a.completedAt?.toISOString() ?? null,
        responseLabel: formatDuration(
          a.answeredAt ? (a.answeredAt.getTime() - a.createdAt.getTime()) / 1000 : null,
        ),
      })),
    };
  }
}
