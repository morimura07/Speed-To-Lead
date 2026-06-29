'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Badge, Card, Spinner } from '../../../components/ui';
import { leadsApi, ApiError } from '../../../lib/api';
import type { Lead } from '../../../lib/types';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leadsApi
      .list()
      .then((res) => setLeads(res.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load leads.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-xs tracking-[0.35em] text-signal">LEADS</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Incoming leads</h1>
        <p className="mt-2 text-sm text-muted">
          Leads land here the moment they enter a connected CRM. Routing them to reps arrives in
          Phase 3.
        </p>
      </header>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <div className="grid place-items-center py-20">
          <Spinner className="size-6 text-signal" />
        </div>
      ) : leads.length === 0 ? (
        <EmptyState />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs tracking-widest text-faint uppercase">
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-paper">{lead.name}</td>
                  <td className="px-4 py-3 text-muted capitalize">{lead.source}</td>
                  <td className="px-4 py-3 text-muted">
                    {lead.email ?? lead.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={lead.status === 'accepted' ? 'success' : 'neutral'}>
                      {lead.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(lead.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {lead.crmRecordUrl && (
                      <Link
                        href={lead.crmRecordUrl}
                        target="_blank"
                        className="text-xs font-medium text-electric hover:underline"
                      >
                        Open in CRM
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border border-line bg-ink">
        <span className="size-2.5 rounded-full bg-signal shadow-[0_0_18px_3px_var(--color-signal)]" />
      </span>
      <div>
        <p className="text-base font-medium text-paper">No leads yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          Connect a CRM under <span className="text-paper">Integrations</span> and your incoming
          leads will appear here in real time.
        </p>
      </div>
      <Link
        href="/dashboard/integrations"
        className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-[#ff6a33]"
      >
        Connect a CRM
      </Link>
    </Card>
  );
}
