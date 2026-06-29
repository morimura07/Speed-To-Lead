'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Card, Spinner } from '../../../components/ui';
import { BarList, ColumnChart, Donut, StatTile } from '../../../components/charts';
import { cn } from '../../../lib/cn';
import { analyticsApi, ApiError } from '../../../lib/api';
import type { AnalyticsLeadDetail, AnalyticsSummary } from '../../../lib/types';

const RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

function fmtDuration(sec: number | null): string {
  if (sec == null) return '—';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [source, setSource] = useState<string>('');
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const from = new Date(Date.now() - days * 86_400_000).toISOString();
    try {
      setData(await analyticsApi.summary({ from, source: source || undefined }));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [days, source]);

  useEffect(() => {
    void load();
  }, [load]);

  const sources = data?.volume.bySource.map((s) => s.source) ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.35em] text-signal">ANALYTICS</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Performance</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Range segmented control */}
          <div className="flex rounded-lg border border-line bg-ink-raised p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => setDays(r.days)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  days === r.days ? 'bg-signal text-ink' : 'text-muted hover:text-paper',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          {/* Source filter */}
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="h-9 rounded-lg border border-line bg-ink-raised px-3 text-xs text-paper outline-none focus:border-signal/70"
          >
            <option value="">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </header>

      {error && <Alert>{error}</Alert>}

      {loading && !data ? (
        <div className="grid place-items-center py-24">
          <Spinner className="size-6 text-signal" />
        </div>
      ) : data ? (
        <div className={cn('space-y-8 transition-opacity', loading && 'opacity-60')}>
          {/* KPIs */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Total leads" value={data.kpis.totalLeads} />
            <Card className="p-5">
              <Donut
                value={data.kpis.connectionRatePct}
                label="Connection rate"
                sublabel={`${data.kpis.accepted} of ${data.kpis.totalLeads} accepted`}
              />
            </Card>
            <StatTile
              label="Avg time to accept"
              value={fmtDuration(data.kpis.avgTimeToAcceptSec)}
              hint={`First alert in ${fmtDuration(data.kpis.avgTimeToFirstAlertSec)}`}
              accent
            />
            <StatTile
              label="Dead-end rate"
              value={`${data.routingHealth.deadEndRatePct}%`}
              hint={`${data.kpis.deadEnd} leads reached no rep`}
            />
          </section>

          {/* Speed + Volume by source */}
          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="p-6">
              <SectionTitle>Response speed</SectionTitle>
              <p className="mb-4 text-xs text-muted">Time from lead arrival to acceptance.</p>
              <BarList
                items={data.speed.responseWindows.map((w) => ({ label: w.label, value: w.count }))}
              />
            </Card>
            <Card className="p-6">
              <SectionTitle>Leads by source</SectionTitle>
              <p className="mb-4 text-xs text-muted">Volume and connection rate per source.</p>
              <BarList
                color="var(--color-electric)"
                items={data.volume.bySource.map((s) => ({
                  label: s.source,
                  value: s.total,
                  hint: `· ${s.connectionRatePct}% conn`,
                }))}
              />
            </Card>
          </section>

          {/* Volume over time */}
          <Card className="p-6">
            <SectionTitle>Leads over time</SectionTitle>
            <p className="mb-5 text-xs text-muted">
              <span className="text-signal">■</span> accepted&nbsp;&nbsp;
              <span className="text-faint">■</span> received
            </p>
            <ColumnChart items={data.volume.byDay} />
          </Card>

          {/* Rep performance */}
          <Card className="overflow-x-auto">
            <div className="p-6 pb-3">
              <SectionTitle>Rep performance</SectionTitle>
            </div>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-y border-line text-xs tracking-widest text-faint uppercase">
                  <Th>Rep</Th>
                  <Th>Alerts</Th>
                  <Th>Accepted</Th>
                  <Th>Pickup</Th>
                  <Th>Acceptance</Th>
                  <Th>Missed</Th>
                  <Th>Avg response</Th>
                </tr>
              </thead>
              <tbody>
                {data.reps.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted">
                      No reps yet.
                    </td>
                  </tr>
                )}
                {data.reps.map((r) => (
                  <tr key={r.id} className="border-b border-line/60 last:border-0">
                    <Td className="font-medium text-paper">{r.name}</Td>
                    <Td className="text-muted">{r.alerts}</Td>
                    <Td className="text-muted">{r.accepted}</Td>
                    <Td>
                      <RateBar pct={r.pickupRatePct} />
                    </Td>
                    <Td>
                      <RateBar pct={r.acceptanceRatePct} />
                    </Td>
                    <Td className="text-muted">{r.missed}</Td>
                    <Td className="font-mono text-muted">{fmtDuration(r.avgResponseSec)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Routing health + reliability */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Avg reps / lead"
              value={data.routingHealth.avgAttemptsPerLead}
              hint="reps contacted before accept"
            />
            <StatTile label="Re-route rate" value={`${data.routingHealth.rerouteRatePct}%`} />
            <StatTile
              label="Ring failure rate"
              value={`${data.reliability.ringFailureRatePct}%`}
              hint={`${data.reliability.ringFailures} of ${data.reliability.totalRings} rings`}
            />
            <StatTile label="CRM sync errors" value={data.reliability.crmSyncErrors} />
          </section>

          {/* Drill-down */}
          <LeadDrilldown days={days} source={source} />
        </div>
      ) : null}
    </div>
  );
}

function LeadDrilldown({ days, source }: { days: number; source: string }) {
  const [rows, setRows] = useState<{ id: string; name: string; source: string; status: string; attempts: number; createdAt: string }[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<AnalyticsLeadDetail | null>(null);

  useEffect(() => {
    const from = new Date(Date.now() - days * 86_400_000).toISOString();
    analyticsApi
      .leads({ from, source: source || undefined })
      .then((r) => setRows(r.items))
      .catch(() => setRows([]));
  }, [days, source]);

  async function toggle(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    setDetail(null);
    setDetail(await analyticsApi.leadDetail(id).catch(() => null));
  }

  const tone = (s: string) =>
    s === 'accepted' ? 'success' : s === 'dead_end' ? 'danger' : 'neutral';

  return (
    <Card className="overflow-hidden">
      <div className="p-6 pb-3">
        <SectionTitle>Lead histories</SectionTitle>
        <p className="mt-1 text-xs text-muted">Click a lead to see its full routing timeline.</p>
      </div>
      <div className="divide-y divide-line/60">
        {rows.length === 0 && (
          <div className="px-6 py-8 text-center text-sm text-muted">No leads in this range.</div>
        )}
        {rows.map((r) => (
          <div key={r.id}>
            <button
              type="button"
              onClick={() => toggle(r.id)}
              className="flex w-full items-center gap-4 px-6 py-3.5 text-left transition-colors hover:bg-ink"
            >
              <span className="min-w-0 flex-1 truncate font-medium text-paper">{r.name}</span>
              <span className="text-xs text-muted capitalize">{r.source}</span>
              <Badge tone={tone(r.status)}>{r.status.replace('_', ' ')}</Badge>
              <span className="w-16 text-right font-mono text-xs text-faint">{r.attempts} try</span>
            </button>
            {expanded === r.id && (
              <div className="border-t border-line/60 bg-ink px-6 py-4">
                {!detail ? (
                  <Spinner className="size-4 text-signal" />
                ) : detail.attempts.length === 0 ? (
                  <p className="text-sm text-muted">No routing attempts recorded.</p>
                ) : (
                  <ol className="space-y-3">
                    {detail.attempts.map((a, i) => (
                      <li key={a.id} className="flex items-center gap-3 text-sm">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line font-mono text-[10px] text-faint">
                          {i + 1}
                        </span>
                        <span className="font-medium text-paper">{a.rep}</span>
                        <Badge tone={a.outcome === 'accepted' ? 'success' : a.outcome === 'declined' ? 'danger' : 'neutral'}>
                          {a.outcome.replace('_', ' ')}
                        </Badge>
                        <span className="ml-auto font-mono text-xs text-muted">
                          {new Date(a.createdAt).toLocaleTimeString()} · {a.responseLabel}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function RateBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink">
        <div
          className="h-full rounded-full bg-mint"
          style={{ width: `${pct}%`, transition: 'width 600ms var(--ease-out-expo)' }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums text-muted">{pct}%</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold tracking-wide text-paper">{children}</h2>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3', className)}>{children}</td>;
}
