'use client';

import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Select, Spinner, TextField } from '../../../components/ui';
import { integrationsApi, repsApi, ApiError } from '../../../lib/api';
import type { CrmType, Integration, Rep, SlackChannelConfig, SlackConfig } from '../../../lib/types';

const CRM_OPTIONS: { value: CrmType; label: string; available: boolean }[] = [
  { value: 'close', label: 'Close CRM', available: true },
  { value: 'hubspot', label: 'HubSpot', available: true },
  { value: 'gohighlevel', label: 'GoHighLevel', available: true },
  { value: 'salesforce', label: 'Salesforce', available: true },
];

export default function IntegrationsPage() {
  const [items, setItems] = useState<Integration[]>([]);
  const [type, setType] = useState<CrmType>('close');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);

  async function load() {
    try {
      setItems(await integrationsApi.list());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load integrations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onConnect() {
    setCreating(true);
    setError(null);
    try {
      const created = await integrationsApi.create(type);
      setNewId(created.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to connect CRM.');
    } finally {
      setCreating(false);
    }
  }

  async function onRemove(id: string) {
    await integrationsApi.remove(id).catch(() => undefined);
    await load();
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs tracking-[0.35em] text-signal">INTEGRATIONS</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Connect your CRM</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Connecting a CRM gives you a secure webhook URL. Add it to your CRM&apos;s outgoing
          webhooks and new leads will flow into LeadArrow automatically.
        </p>
      </header>

      {error && <Alert>{error}</Alert>}

      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="sm:w-64">
            <Select
              label="CRM provider"
              value={type}
              onChange={(e) => setType(e.target.value as CrmType)}
            >
              {CRM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} disabled={!o.available}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={onConnect} loading={creating}>
            Connect
          </Button>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-muted">Connected sources</h2>
        {loading ? (
          <div className="grid place-items-center py-16">
            <Spinner className="size-6 text-signal" />
          </div>
        ) : items.length === 0 ? (
          <Card className="px-6 py-12 text-center text-sm text-muted">
            No CRMs connected yet. Connect one above to get your webhook URL.
          </Card>
        ) : (
          items.map((it) => (
            <IntegrationCard
              key={it.id}
              integration={it}
              highlight={it.id === newId}
              onRemove={() => onRemove(it.id)}
            />
          ))
        )}
      </section>

      <SlackCard />
    </div>
  );
}

function IntegrationCard({
  integration,
  highlight,
  onRemove,
}: {
  integration: Integration;
  highlight: boolean;
  onRemove: () => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold capitalize text-paper">{integration.type}</span>
          <Badge tone={integration.status === 'active' ? 'success' : 'neutral'}>
            {integration.status}
          </Badge>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-medium text-signal hover:underline"
        >
          Remove
        </button>
      </div>

      {highlight && (
        <p className="mt-3 text-xs text-mint">
          Connected. Copy the signing secret now and add both values to your CRM&apos;s webhook
          settings.
        </p>
      )}

      <div className="mt-4 space-y-3">
        <CopyField label="Webhook URL" value={integration.webhookUrl} />
        <CopyField label="Signing secret" value={integration.signingSecret} secret />
      </div>
    </Card>
  );
}

function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [revealed, setRevealed] = useState(!secret);
  const [copied, setCopied] = useState(false);

  const shown = revealed ? value : '•'.repeat(Math.min(value.length, 40));

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium tracking-widest text-faint uppercase">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg border border-line bg-ink px-3 py-2 font-mono text-xs text-paper">
          {shown}
        </code>
        {secret && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="shrink-0 rounded-lg border border-line bg-ink-raised px-3 py-2 text-xs text-muted hover:text-paper"
          >
            {revealed ? 'Hide' : 'Reveal'}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="shrink-0 rounded-lg border border-line bg-ink-raised px-3 py-2 text-xs text-muted hover:text-paper"
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function SlackCard() {
  const [cfg, setCfg] = useState<SlackConfig | null>(null);
  const [reps, setReps] = useState<Rep[]>([]);
  const [teamId, setTeamId] = useState('');
  const [bookingMode, setBookingMode] = useState<'triage' | 'closer'>('closer');
  const [setterRepId, setSetterRepId] = useState('');
  const [channels, setChannels] = useState<SlackChannelConfig[]>([]);
  const [chId, setChId] = useState('');
  const [chPurpose, setChPurpose] = useState<'leads' | 'bookings'>('bookings');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([integrationsApi.getSlack(), repsApi.list()]).then(([c, r]) => {
      setCfg(c);
      setReps(r);
      setTeamId(c.teamId);
      setBookingMode(c.bookingMode);
      setSetterRepId(c.setterRepId ?? '');
      setChannels(c.channels);
    });
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const next = await integrationsApi.configureSlack({
        teamId: teamId.trim(),
        bookingMode,
        setterRepId: bookingMode === 'triage' ? setterRepId || undefined : undefined,
        channels,
      });
      setCfg(next);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!cfg) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium tracking-wide text-muted">
        Slack <span className="text-faint">— booking alerts & lead source</span>
      </h2>
      <Card className="space-y-5 p-6">
        <CopyField label="Slack Events Request URL" value={cfg.eventsUrl} />
        <p className="-mt-2 text-xs text-faint">
          Add this as the Request URL in your Slack app&apos;s Event Subscriptions, then configure
          below.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Workspace (team) ID" name="teamId" value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="T01ABCDEF" />
          <Select label="Booking mode" name="mode" value={bookingMode} onChange={(e) => setBookingMode(e.target.value as 'triage' | 'closer')}>
            <option value="closer">Closer — alert the closer by host email</option>
            <option value="triage">Triage — call a setter to confirm</option>
          </Select>
        </div>

        {bookingMode === 'triage' && (
          <Select label="Setter (confirms bookings)" name="setter" value={setterRepId} onChange={(e) => setSetterRepId(e.target.value)}>
            <option value="">Select setter…</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        )}

        <div>
          <p className="mb-2 text-[11px] font-medium tracking-widest text-faint uppercase">Monitored channels</p>
          <div className="space-y-2">
            {channels.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                <code className="rounded border border-line bg-ink px-2 py-1 font-mono text-xs text-paper">{c.id}</code>
                <Badge tone={c.purpose === 'leads' ? 'accent' : 'neutral'}>{c.purpose}</Badge>
                <button type="button" onClick={() => setChannels((xs) => xs.filter((x) => x.id !== c.id))} className="text-xs text-faint hover:text-signal">
                  remove
                </button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <input value={chId} onChange={(e) => setChId(e.target.value)} placeholder="Channel ID (C01…)" className="h-9 rounded-lg border border-line bg-ink-raised px-3 text-xs text-paper outline-none focus:border-signal/70" />
              <select value={chPurpose} onChange={(e) => setChPurpose(e.target.value as 'leads' | 'bookings')} className="h-9 rounded-lg border border-line bg-ink-raised px-3 text-xs text-paper outline-none">
                <option value="bookings">bookings</option>
                <option value="leads">leads</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  if (chId && !channels.some((c) => c.id === chId)) {
                    setChannels((xs) => [...xs, { id: chId.trim(), purpose: chPurpose }]);
                    setChId('');
                  }
                }}
                className="h-9 rounded-lg border border-line bg-ink-raised px-3 text-xs text-muted hover:text-paper"
              >
                Add channel
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={save} loading={saving} className="h-9 px-4 text-xs">Save Slack config</Button>
          {saved && <span className="text-xs text-mint">Saved ✓</span>}
          {cfg.configured && <Badge tone="success">connected</Badge>}
        </div>
      </Card>
    </section>
  );
}
