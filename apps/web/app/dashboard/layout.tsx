'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Wordmark } from '../../components/logo';
import { Button, Spinner } from '../../components/ui';
import { cn } from '../../lib/cn';
import { useAuth } from '../../lib/auth';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/leads', label: 'Leads' },
  { href: '/dashboard/analytics', label: 'Analytics' },
  { href: '/dashboard/team', label: 'Team' },
  { href: '/dashboard/follow-ups', label: 'Follow-ups' },
  { href: '/dashboard/integrations', label: 'Integrations' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status, user, logout } = useAuth();

  useEffect(() => {
    if (status === 'guest') router.replace('/login');
  }, [status, router]);

  // Gate the dashboard once a trial has expired and there's no subscription.
  useEffect(() => {
    if (status === 'authed' && user) {
      const o = user.organization;
      const access =
        o.subscriptionStatus === 'active' ||
        (o.subscriptionStatus === 'trialing' && (o.trialDaysRemaining == null || o.trialDaysRemaining > 0));
      if (!access) router.replace('/billing');
    }
  }, [status, user, router]);

  if (status !== 'authed' || !user) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink text-muted">
        <Spinner className="size-6 text-signal" />
      </div>
    );
  }

  const org = user.organization;
  const onTrial = org.subscriptionStatus === 'trialing';

  return (
    <DashboardChrome org={org} email={user.email} onTrial={onTrial} logout={logout}>
      {children}
    </DashboardChrome>
  );
}

function DashboardChrome({
  org,
  email,
  onTrial,
  logout,
  children,
}: {
  org: { subscriptionStatus: string; trialDaysRemaining: number | null };
  email: string;
  onTrial: boolean;
  logout: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-ink text-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Wordmark />
          <div className="flex items-center gap-4">
            {onTrial && org.trialDaysRemaining != null && (
              <Link
                href="/billing"
                className="hidden items-center gap-2 rounded-full border border-line bg-ink-raised px-3 py-1.5 transition-colors hover:border-signal/60 sm:inline-flex"
                title="Subscribe"
              >
                <span className="size-1.5 rounded-full bg-mint" />
                <span className="font-mono text-[11px] tracking-widest text-muted">
                  TRIAL · {org.trialDaysRemaining}D LEFT
                </span>
              </Link>
            )}
            <span className="hidden text-sm text-muted md:inline">{email}</span>
            <Button variant="outline" className="h-9 px-3 text-xs" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 px-4">
          {NAV.map((item) => {
            const active =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative px-3 py-2.5 text-sm transition-colors',
                  active ? 'text-paper' : 'text-muted hover:text-paper',
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-signal" />
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
