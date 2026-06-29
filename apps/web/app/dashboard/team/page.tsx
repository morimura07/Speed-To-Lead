'use client';

import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Spinner, TextField } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { repsApi, routingApi, ApiError } from '../../../lib/api';
import type { Rep, RoutingMethod } from '../../../lib/types';

export default function TeamPage() {
  const [reps, setReps] = useState<Rep[]>([]);
  const [method, setMethod] = useState<RoutingMethod>('round_robin');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [repList, config] = await Promise.all([repsApi.list(), routingApi.getConfig()]);
      setReps(repList);
      setMethod(config.routingMethod);
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

  async function changeMethod(next: RoutingMethod) {
    setMethod(next);
    await routingApi.setConfig(next).catch(() => undefined);
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs tracking-[0.35em] text-signal">TEAM</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Reps & routing</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Add the reps who should be rung when a lead lands, and choose how leads are
          distributed across them.
        </p>
      </header>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <div className="grid place-items-center py-16">
          <Spinner className="size-6 text-signal" />
        </div>
      ) : (
        <>
          <RoutingMethodCard method={method} onChange={changeMethod} />
          <AddRep onAdded={load} />
          <RepList reps={reps} method={method} onChanged={load} />
        </>
      )}
    </div>
  );
}

function RoutingMethodCard({
  method,
  onChange,
}: {
  method: RoutingMethod;
  onChange: (m: RoutingMethod) => void;
}) {
  const options: { value: RoutingMethod; title: string; desc: string }[] = [
    { value: 'round_robin', title: 'Round robin', desc: 'Leads rotate evenly across available reps.' },
    { value: 'percentage', title: 'Percentage', desc: 'Distribute by the weight set on each rep.' },
  ];
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium tracking-wide text-muted">Routing method</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const active = method === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={cn(
                'rounded-2xl border bg-ink-raised p-5 text-left transition-colors',
                active ? 'border-signal' : 'border-line hover:border-faint',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-paper">{o.title}</span>
                <span
                  className={cn(
                    'grid size-5 place-items-center rounded-full border',
                    active ? 'border-signal' : 'border-line',
                  )}
                >
                  {active && <span className="size-2.5 rounded-full bg-signal" />}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-muted">{o.desc}</p>
            </button>
          );
        })}
      </div>
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
      await repsApi.create({
        name,
        phone,
        routingPercent: percent ? Number(percent) : undefined,
      });
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
          <TextField
            label="Name"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Rivera"
          />
          <TextField
            label="Phone"
            name="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 010 0100"
          />
          <TextField
            label="Weight %"
            name="percent"
            type="number"
            min={0}
            max={100}
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            placeholder="—"
          />
          <Button type="submit" loading={submitting}>
            Add rep
          </Button>
          {error && <div className="sm:col-span-4"><Alert>{error}</Alert></div>}
        </form>
      </Card>
    </section>
  );
}

function RepList({
  reps,
  method,
  onChanged,
}: {
  reps: Rep[];
  method: RoutingMethod;
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
          <RepRow key={rep.id} rep={rep} showWeight={method === 'percentage'} onChanged={onChanged} />
        ))}
      </Card>
    </section>
  );
}

function RepRow({
  rep,
  showWeight,
  onChanged,
}: {
  rep: Rep;
  showWeight: boolean;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function patch(p: Parameters<typeof repsApi.update>[1]) {
    setBusy(true);
    try {
      await repsApi.update(rep.id, p);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    await repsApi.remove(rep.id).catch(() => undefined);
    await onChanged();
  }

  return (
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

      <Badge tone={rep.active ? 'success' : 'neutral'}>{rep.active ? 'active' : 'paused'}</Badge>

      <button
        type="button"
        disabled={busy}
        onClick={() => patch({ active: !rep.active })}
        className="text-xs font-medium text-electric hover:underline disabled:opacity-50"
      >
        {rep.active ? 'Pause' : 'Activate'}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={remove}
        className="text-xs font-medium text-signal hover:underline disabled:opacity-50"
      >
        Remove
      </button>
    </div>
  );
}
