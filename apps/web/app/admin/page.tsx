'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wordmark } from '../../components/logo';
import { Alert, Badge, Button, Card, Select, Spinner, TextField } from '../../components/ui';
import { useAdminAuth } from '../../lib/auth';
import { adminApi, ApiError } from '../../lib/api';
import type { AdminStats, LicenseKey, LicenseKeyType, SignupRow } from '../../lib/types';

export default function AdminConsole() {
  const router = useRouter();
  const { status, admin, logout } = useAdminAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [s, k, su] = await Promise.all([
        adminApi.stats(),
        adminApi.listKeys(),
        adminApi.signups(),
      ]);
      setStats(s);
      setKeys(k.items);
      setSignups(su.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'guest') router.replace('/admin/login');
    if (status === 'authed') void loadAll();
  }, [status, router, loadAll]);

  if (status !== 'authed' || !admin) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink">
        <Spinner className="size-6 text-signal" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-ink text-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Wordmark />
            <Badge tone="accent">Admin</Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted md:inline">{admin.email}</span>
            <Button variant="outline" className="h-9 px-3 text-xs" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        {error && <Alert>{error}</Alert>}

        {loading ? (
          <div className="grid place-items-center py-20">
            <Spinner className="size-6 text-signal" />
          </div>
        ) : (
          <>
            <StatsGrid stats={stats} />
            <GenerateKeys onCreated={loadAll} />
            <KeysTable keys={keys} onChanged={loadAll} />
            <SignupsTable signups={signups} />
          </>
        )}
      </main>
    </div>
  );
}

function StatsGrid({ stats }: { stats: AdminStats | null }) {
  if (!stats) return null;
  const cells = [
    { label: 'Keys issued', value: stats.keys.total },
    { label: 'Active keys', value: stats.keys.active },
    { label: 'Redeemed', value: stats.keys.redeemed },
    { label: 'Companies', value: stats.organizations.total },
    { label: 'On trial', value: stats.organizations.trialing },
    { label: 'Converted', value: `${stats.organizations.conversionRatePct}%` },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cells.map((c) => (
        <Card key={c.label} className="p-4">
          <p className="font-mono text-[10px] tracking-widest text-faint uppercase">{c.label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-paper">{c.value}</p>
        </Card>
      ))}
    </section>
  );
}

function GenerateKeys({ onCreated }: { onCreated: () => Promise<void> }) {
  const [type, setType] = useState<LicenseKeyType>('timed');
  const [trialDays, setTrialDays] = useState('30');
  const [count, setCount] = useState('1');
  const [notes, setNotes] = useState('');
  const [created, setCreated] = useState<LicenseKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await adminApi.createKeys({
        type,
        trialDays: type === 'timed' ? Number(trialDays) : undefined,
        count: Number(count),
        notes: notes.trim() || undefined,
      });
      setCreated(result);
      setNotes('');
      await onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate keys.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2 className="mb-4 text-sm font-medium tracking-wide text-muted">Generate access keys</h2>
      <Card className="p-6">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-4">
          <Select label="Type" name="type" value={type} onChange={(e) => setType(e.target.value as LicenseKeyType)}>
            <option value="timed">Timed trial</option>
            <option value="unlimited">Unlimited</option>
          </Select>
          <TextField
            label="Trial days"
            name="trialDays"
            type="number"
            min={1}
            max={365}
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
            disabled={type !== 'timed'}
          />
          <TextField
            label="Quantity"
            name="count"
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
          <TextField
            label="Notes (optional)"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. ACME pilot"
          />
          <div className="sm:col-span-4">
            {error && <Alert>{error}</Alert>}
          </div>
          <div className="sm:col-span-4">
            <Button type="submit" loading={submitting}>
              Generate
            </Button>
          </div>
        </form>

        {created.length > 0 && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="mb-3 text-xs text-muted">
              {created.length} key{created.length > 1 ? 's' : ''} generated — copy and share:
            </p>
            <div className="flex flex-wrap gap-2">
              {created.map((k) => (
                <CopyChip key={k.id} code={k.code} />
              ))}
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}

function CopyChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="rounded-md border border-line bg-ink px-3 py-1.5 font-mono text-xs tracking-wide text-paper transition-colors hover:border-signal/60"
    >
      {copied ? 'copied ✓' : code}
    </button>
  );
}

function KeysTable({ keys, onChanged }: { keys: LicenseKey[]; onChanged: () => Promise<void> }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(key: LicenseKey) {
    setBusyId(key.id);
    try {
      if (key.status === 'active') await adminApi.disableKey(key.id);
      else if (key.status === 'disabled') await adminApi.enableKey(key.id);
      await onChanged();
    } finally {
      setBusyId(null);
    }
  }

  const tone = (s: LicenseKey['status']) =>
    s === 'active' ? 'success' : s === 'redeemed' ? 'accent' : 'neutral';

  return (
    <section>
      <h2 className="mb-4 text-sm font-medium tracking-wide text-muted">License keys</h2>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs tracking-widest text-faint uppercase">
              <Th>Key</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Redeemed by</Th>
              <Th>Created</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No keys yet. Generate your first above.
                </td>
              </tr>
            )}
            {keys.map((k) => (
              <tr key={k.id} className="border-b border-line/60 last:border-0">
                <Td className="font-mono text-xs text-paper">{k.code}</Td>
                <Td>{k.type === 'timed' ? `${k.trialDays ?? '—'}d trial` : 'Unlimited'}</Td>
                <Td>
                  <Badge tone={tone(k.status)}>{k.status}</Badge>
                </Td>
                <Td className="text-muted">{k.redeemedByOrg?.name ?? '—'}</Td>
                <Td className="text-muted">{new Date(k.createdAt).toLocaleDateString()}</Td>
                <Td className="text-right">
                  {k.status === 'redeemed' ? (
                    <span className="text-xs text-faint">—</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void toggle(k)}
                      disabled={busyId === k.id}
                      className="text-xs font-medium text-electric hover:underline disabled:opacity-50"
                    >
                      {k.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

function SignupsTable({ signups }: { signups: SignupRow[] }) {
  return (
    <section>
      <h2 className="mb-4 text-sm font-medium tracking-wide text-muted">Sign-ups</h2>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs tracking-widest text-faint uppercase">
              <Th>Company</Th>
              <Th>Owner</Th>
              <Th>Status</Th>
              <Th>Trial ends</Th>
              <Th>Key</Th>
            </tr>
          </thead>
          <tbody>
            {signups.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No sign-ups yet.
                </td>
              </tr>
            )}
            {signups.map((s) => (
              <tr key={s.id} className="border-b border-line/60 last:border-0">
                <Td className="text-paper">{s.company}</Td>
                <Td className="text-muted">{s.ownerEmail ?? '—'}</Td>
                <Td>
                  <Badge tone={s.subscriptionStatus === 'active' ? 'success' : 'neutral'}>
                    {s.subscriptionStatus}
                  </Badge>
                </Td>
                <Td className="text-muted">
                  {s.trialEndsAt ? new Date(s.trialEndsAt).toLocaleDateString() : '—'}
                </Td>
                <Td className="font-mono text-xs text-muted">{s.licenseKey ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-medium ${className ?? ''}`}>{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className ?? ''}`}>{children}</td>;
}
