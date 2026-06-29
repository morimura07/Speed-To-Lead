'use client';

import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Select, Spinner } from '../../../components/ui';
import { integrationsApi, ApiError } from '../../../lib/api';
import type { CrmType, Integration } from '../../../lib/types';

// Only Close is wired in Phase 2; the others get adapters in a later phase.
const CRM_OPTIONS: { value: CrmType; label: string; available: boolean }[] = [
  { value: 'close', label: 'Close CRM', available: true },
  { value: 'hubspot', label: 'HubSpot (soon)', available: false },
  { value: 'gohighlevel', label: 'GoHighLevel (soon)', available: false },
  { value: 'salesforce', label: 'Salesforce (soon)', available: false },
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
