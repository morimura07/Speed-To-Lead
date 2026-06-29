'use client';

import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Spinner, Switch, TextField } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { repsApi, routingApi, ApiError } from '../../../lib/api';
import type { Rep, RoutingConfig, RoutingMethod, WeekSchedule } from '../../../lib/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function timezones(): string[] {
  const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
  if (typeof fn === 'function') return fn('timeZone');
  return ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London'];
}

export default function TeamPage() {
  const [reps, setReps] = useState<Rep[]>([]);
  const [config, setConfig] = useState<RoutingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [repList, cfg] = await Promise.all([repsApi.list(), routingApi.getConfig()]);
      setReps(repList);
      setConfig(cfg);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load team.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function patchConfig(patch: Partial<RoutingConfig>) {
    setConfig((c) => (c ? { ...c, ...patch } : c));
    await routingApi.setConfig(patch).catch(() => undefined);
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs tracking-[0.35em] text-signal">TEAM</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Reps, routing & availability</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Add the reps who get rung, choose how leads distribute, and set when each rep is
          available.
        </p>
      </header>

      {error && <Alert>{error}</Alert>}

      {loading || !config ? (
        <div className="grid place-items-center py-16">
          <Spinner className="size-6 text-signal" />
        </div>
      ) : (
        <>
          <OrgSettings config={config} onChange={patchConfig} />
          <AddRep onAdded={load} />
          <RepList reps={reps} method={config.routingMethod} orgTz={config.timezone} onChanged={load} />
        </>
      )}
    </div>
  );
}

function OrgSettings({
  config,
  onChange,
}: {
  config: RoutingConfig;
  onChange: (patch: Partial<RoutingConfig>) => void;
}) {
  const methods: { value: RoutingMethod; title: string; desc: string }[] = [
    { value: 'round_robin', title: 'Round robin', desc: 'Leads rotate evenly across available reps.' },
    { value: 'percentage', title: 'Percentage', desc: 'Distribute by the weight set on each rep.' },
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium tracking-wide text-muted">Routing & defaults</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {methods.map((o) => {
          const active = config.routingMethod === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange({ routingMethod: o.value })}
              className={cn(
                'rounded-2xl border bg-ink-raised p-5 text-left transition-colors',
                active ? 'border-signal' : 'border-line hover:border-faint',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-paper">{o.title}</span>
                <span className={cn('grid size-5 place-items-center rounded-full border', active ? 'border-signal' : 'border-line')}>
                  {active && <span className="size-2.5 rounded-full bg-signal" />}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-muted">{o.desc}</p>
            </button>
          );
        })}
      </div>

      <Card className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:w-72">
          <label className="mb-1.5 block text-[13px] font-medium text-muted">Default timezone</label>
          <select
            value={config.timezone}
            onChange={(e) => onChange({ timezone: e.target.value })}
            className="h-11 w-full rounded-lg border border-line bg-ink px-3 text-sm text-paper outline-none focus:border-signal/70"
          >
            {timezones().map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-faint">Used when a rep has no timezone of their own.</p>
        </div>

        <div className="flex items-start gap-3 sm:max-w-xs">
          <Switch
            checked={config.calendarBusyCheck}
            onChange={(v) => onChange({ calendarBusyCheck: v })}
          />
          <div>
            <p className="text-sm font-medium text-paper">Skip calendar-busy reps</p>
            <p className="mt-0.5 text-xs text-muted">
              Google Calendar connection arrives with credentials — until then this has no effect.
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}

function AddRep({ onAdded }: { onAdded: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [percent, setPercent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await repsApi.create({ name, phone, routingPercent: percent ? Number(percent) : undefined });
      setName('');
      setPhone('');
      setPercent('');
      await onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add rep.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium tracking-wide text-muted">Add a rep</h2>
      <Card className="p-6">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_140px_auto] sm:items-end">
          <TextField label="Name" name="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Rivera" />
          <TextField label="Phone" name="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 010 0100" />
          <TextField label="Weight %" name="percent" type="number" min={0} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="—" />
          <Button type="submit" loading={submitting}>Add rep</Button>
          {error && <div className="sm:col-span-4"><Alert>{error}</Alert></div>}
        </form>
      </Card>
    </section>
  );
}

function RepList({
  reps,
  method,
  orgTz,
  onChanged,
}: {
  reps: Rep[];
  method: RoutingMethod;
  orgTz: string;
  onChanged: () => Promise<void>;
}) {
  if (reps.length === 0) {
    return (
      <Card className="px-6 py-12 text-center text-sm text-muted">
        No reps yet. Add your first above so leads have someone to ring.
      </Card>
    );
  }
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium tracking-wide text-muted">
        Reps <span className="text-faint">({reps.length})</span>
      </h2>
      <Card className="divide-y divide-line/60">
        {reps.map((rep) => (
          <RepRow key={rep.id} rep={rep} showWeight={method === 'percentage'} orgTz={orgTz} onChanged={onChanged} />
        ))}
      </Card>
    </section>
  );
}

function RepRow({
  rep,
  showWeight,
  orgTz,
  onChanged,
}: {
  rep: Rep;
  showWeight: boolean;
  orgTz: string;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function patch(p: Parameters<typeof repsApi.update>[1]) {
    setBusy(true);
    try {
      await repsApi.update(rep.id, p);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  const workingDays = Object.keys(rep.availability ?? {}).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-paper">{rep.name}</p>
          <p className="truncate font-mono text-xs text-muted">{rep.phone}</p>
        </div>
        {showWeight && (
          <div className="flex items-center gap-1.5 text-sm text-muted">
            <span className="font-mono tabular-nums text-paper">{rep.routingPercent ?? 0}</span>
            <span className="text-faint">%</span>
          </div>
        )}
        <span className="hidden font-mono text-[11px] text-faint sm:inline">
          {workingDays === 0 ? 'always on' : `${workingDays}d/wk`}
        </span>
        <Badge tone={rep.active ? 'success' : 'neutral'}>{rep.active ? 'active' : 'paused'}</Badge>
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-electric hover:underline">
          {open ? 'Close' : 'Hours'}
        </button>
        <button type="button" disabled={busy} onClick={() => patch({ active: !rep.active })} className="text-xs font-medium text-muted hover:text-paper disabled:opacity-50">
          {rep.active ? 'Pause' : 'Activate'}
        </button>
        <button type="button" disabled={busy} onClick={async () => { setBusy(true); await repsApi.remove(rep.id).catch(() => undefined); await onChanged(); }} className="text-xs font-medium text-signal hover:underline disabled:opacity-50">
          Remove
        </button>
      </div>
      {open && (
        <div className="border-t border-line/60 bg-ink px-5 py-5">
          <AvailabilityEditor rep={rep} orgTz={orgTz} onSaved={async () => { await onChanged(); }} />
        </div>
      )}
    </div>
  );
}

function AvailabilityEditor({ rep, orgTz, onSaved }: { rep: Rep; orgTz: string; onSaved: () => Promise<void> }) {
  const initialDays = WEEKDAYS.map((_, d) => {
    const win = rep.availability?.[String(d)]?.[0];
    return { enabled: Boolean(win), start: win?.start ?? '09:00', end: win?.end ?? '17:00' };
  });
  const [days, setDays] = useState(initialDays);
  const [daysOff, setDaysOff] = useState<string[]>(rep.daysOff ?? []);
  const [tz, setTz] = useState(rep.timezone ?? '');
  const [newDayOff, setNewDayOff] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function setDay(i: number, patch: Partial<(typeof days)[number]>) {
    setDays((ds) => ds.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const availability: WeekSchedule = {};
    days.forEach((d, idx) => {
      if (d.enabled) availability[String(idx)] = [{ start: d.start, end: d.end }];
    });
    try {
      await repsApi.setAvailability(rep.id, { availability, daysOff, timezone: tz || undefined });
      setSaved(true);
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save availability.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Weekly schedule */}
      <div>
        <p className="mb-2 text-xs font-medium tracking-widest text-faint uppercase">Working hours</p>
        <div className="space-y-2">
          {days.map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDay(i, { enabled: !d.enabled })}
                className={cn(
                  'w-12 rounded-md border py-1.5 text-xs font-medium transition-colors',
                  d.enabled ? 'border-signal bg-signal/15 text-paper' : 'border-line text-faint',
                )}
              >
                {WEEKDAYS[i]}
              </button>
              {d.enabled ? (
                <div className="flex items-center gap-2 text-sm">
                  <input type="time" value={d.start} onChange={(e) => setDay(i, { start: e.target.value })} className="rounded-md border border-line bg-ink-raised px-2 py-1.5 text-paper outline-none focus:border-signal/70" />
                  <span className="text-faint">to</span>
                  <input type="time" value={d.end} onChange={(e) => setDay(i, { end: e.target.value })} className="rounded-md border border-line bg-ink-raised px-2 py-1.5 text-paper outline-none focus:border-signal/70" />
                </div>
              ) : (
                <span className="text-sm text-faint">Off</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Days off */}
      <div>
        <p className="mb-2 text-xs font-medium tracking-widest text-faint uppercase">Days off</p>
        <div className="flex flex-wrap items-center gap-2">
          {daysOff.map((d) => (
            <span key={d} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-ink-raised px-2.5 py-1 font-mono text-xs text-paper">
              {d}
              <button type="button" onClick={() => setDaysOff((xs) => xs.filter((x) => x !== d))} className="text-faint hover:text-signal">
                ×
              </button>
            </span>
          ))}
          <input type="date" value={newDayOff} onChange={(e) => setNewDayOff(e.target.value)} className="rounded-md border border-line bg-ink-raised px-2 py-1.5 text-xs text-paper outline-none focus:border-signal/70" />
          <button
            type="button"
            onClick={() => { if (newDayOff && !daysOff.includes(newDayOff)) { setDaysOff((xs) => [...xs, newDayOff].sort()); setNewDayOff(''); } }}
            className="rounded-md border border-line bg-ink-raised px-2.5 py-1.5 text-xs text-muted hover:text-paper"
          >
            Add
          </button>
        </div>
      </div>

      {/* Timezone override */}
      <div className="sm:w-72">
        <p className="mb-2 text-xs font-medium tracking-widest text-faint uppercase">Timezone</p>
        <select value={tz} onChange={(e) => setTz(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-ink-raised px-3 text-sm text-paper outline-none focus:border-signal/70">
          <option value="">Use team default ({orgTz})</option>
          {timezones().map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} loading={saving} className="h-9 px-4 text-xs">Save hours</Button>
        {saved && <span className="text-xs text-mint">Saved ✓</span>}
        {error && <span className="text-xs text-signal">{error}</span>}
      </div>
    </div>
  );
}
