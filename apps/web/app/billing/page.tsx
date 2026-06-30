'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wordmark } from '../../components/logo';
import { Alert, Button, Card, Spinner } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { billingApi, ApiError } from '../../lib/api';
import type { BillingStatus } from '../../lib/types';

export default function BillingPage() {
  const router = useRouter();
  const { status: authStatus } = useAuth();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (authStatus === 'guest') router.replace('/login');
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus === 'authed') {
      billingApi.status().then(setBilling).catch(() => setBilling(null));
    }
  }, [authStatus]);

  async function subscribe() {
    setWorking(true);
    setError(null);
    try {
      const { url } = await billingApi.checkout();
      window.location.href = url;
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 503
          ? 'Billing isn’t configured yet. Add your Stripe keys to enable checkout.'
          : err instanceof ApiError
            ? err.message
            : 'Could not start checkout.',
      );
      setWorking(false);
    }
  }

  if (authStatus !== 'authed' || !billing) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink">
        <Spinner className="size-6 text-signal" />
      </div>
    );
  }

  const expired = !billing.hasAccess;
  const active = billing.subscriptionStatus === 'active';

  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-6 text-paper">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Wordmark />
          </Link>
        </div>

        <Card className="p-8">
          {active ? (
            <>
              <p className="font-mono text-xs tracking-[0.35em] text-mint">SUBSCRIPTION ACTIVE</p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">You&apos;re all set</h1>
              <p className="mt-2 text-sm text-muted">Your LeadArrow subscription is active.</p>
              <Link href="/dashboard" className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-signal px-6 text-sm font-semibold text-ink hover:bg-[#ff6a33]">
                Go to dashboard
              </Link>
            </>
          ) : (
            <>
              <p className="font-mono text-xs tracking-[0.35em] text-signal">
                {expired ? 'TRIAL ENDED' : 'SUBSCRIBE'}
              </p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                {expired ? 'Your trial has ended' : 'Upgrade to a paid plan'}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {expired
                  ? 'Subscribe to keep routing leads to your team.'
                  : billing.trialDaysRemaining != null
                    ? `${billing.trialDaysRemaining} days left in your trial.`
                    : 'Subscribe to LeadArrow.'}
              </p>

              <div className="mt-6 rounded-xl border border-line bg-ink p-5 text-center">
                <p className="text-3xl font-semibold tracking-tight">
                  $750<span className="text-base font-normal text-muted">/mo</span>
                </p>
                <p className="mt-1 text-xs text-muted">Final pricing scoped to your team.</p>
              </div>

              {error && <div className="mt-4"><Alert>{error}</Alert></div>}

              <Button onClick={subscribe} loading={working} className="mt-5 w-full">
                Subscribe with Stripe
              </Button>
              {!expired && (
                <Link href="/dashboard" className="mt-3 block text-center text-sm text-muted hover:text-paper">
                  Back to dashboard
                </Link>
              )}
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
