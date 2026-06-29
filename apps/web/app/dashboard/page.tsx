'use client';

import Link from 'next/link';
import { Card } from '../../components/ui';
import { cn } from '../../lib/cn';
import { useAuth } from '../../lib/auth';

const MODULES = [
  { key: 'integrations', name: 'Integrations', tag: 'Ready', href: '/dashboard/integrations', desc: 'Connect Close CRM and start receiving leads via secure webhook.' },
  { key: 'leads', name: 'Live Leads', tag: 'Ready', href: '/dashboard/leads', desc: 'Incoming leads from your CRM, normalized into one feed.' },
  { key: 'team', name: 'Team & Routing', tag: 'Ready', href: '/dashboard/team', desc: 'Add reps and choose round-robin or percentage routing.' },
  { key: 'routing', name: 'Phone Ring', tag: 'Ready', href: null, desc: 'New leads ring the right rep — press 1 to accept, 2 to decline.' },
  { key: 'analytics', name: 'Analytics', tag: 'Ready', href: '/dashboard/analytics', desc: 'Speed-to-lead, pickup rates, routing health, and reliability.' },
  { key: 'availability', name: 'Availability & Calendar', tag: 'Phase 5', href: null, desc: 'Working hours, days off, and Google Calendar busy-checking.' },
];

export default function DashboardHome() {
  const { user } = useAuth();
  if (!user) return null;

  const firstName = user.fullName.split(' ')[0];
  const org = user.organization;

  return (
    <div className="space-y-10">
      <section>
        <p className="font-mono text-xs tracking-[0.35em] text-signal">DASHBOARD</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Welcome, {firstName}.
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          {org.name} is set up and ready. Your workspace lights up as each part of the
          platform comes online.
        </p>
      </section>

      {/* Trial / status banner */}
      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-11 place-items-center rounded-xl border border-line bg-ink">
            <span className="size-2.5 rounded-full bg-mint shadow-[0_0_18px_3px_var(--color-mint)]" />
          </span>
          <div>
            <p className="text-sm font-medium text-paper">
              {org.subscriptionStatus === 'trialing'
                ? 'Free trial active'
                : org.subscriptionStatus === 'active'
                  ? 'Subscription active'
                  : `Status: ${org.subscriptionStatus}`}
            </p>
            <p className="text-sm text-muted">
              {org.trialDaysRemaining != null
                ? `${org.trialDaysRemaining} days remaining in your trial.`
                : 'Full access enabled.'}
            </p>
          </div>
        </div>
        {org.trialEndsAt && (
          <p className="font-mono text-[11px] tracking-widest text-faint">
            ENDS {new Date(org.trialEndsAt).toLocaleDateString()}
          </p>
        )}
      </Card>

      {/* Modules */}
      <section>
        <h2 className="mb-4 text-sm font-medium tracking-wide text-muted">Your workspace</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {MODULES.map((m) => {
            const inner = (
              <Card
                className={cn(
                  'group relative h-full overflow-hidden p-5',
                  m.href && 'transition-colors hover:border-faint',
                )}
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-semibold text-paper">{m.name}</h3>
                  <span
                    className={cn(
                      'rounded-md border px-2 py-1 font-mono text-[10px] tracking-widest',
                      m.tag === 'Ready'
                        ? 'border-mint/40 text-mint'
                        : 'border-line bg-ink text-faint',
                    )}
                  >
                    {m.tag}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{m.desc}</p>
              </Card>
            );
            return m.href ? (
              <Link key={m.key} href={m.href}>
                {inner}
              </Link>
            ) : (
              <div key={m.key}>{inner}</div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
