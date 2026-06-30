'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wordmark } from '../../../components/logo';
import { Card, Spinner } from '../../../components/ui';
import { useAuth } from '../../../lib/auth';
import { billingApi } from '../../../lib/api';
import type { BillingStatus } from '../../../lib/types';

export default function BillingSuccessPage() {
  const { status } = useAuth();
  const [billing, setBilling] = useState<BillingStatus | null>(null);

  useEffect(() => {
    if (status === 'authed') {
      // The webhook may take a moment; poll briefly for activation.
      let tries = 0;
      const tick = async () => {
        const s = await billingApi.status().catch(() => null);
        setBilling(s);
        tries += 1;
        if (s && s.subscriptionStatus !== 'active' && tries < 6) setTimeout(tick, 1500);
      };
      void tick();
    }
  }, [status]);

  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-6 text-paper">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Wordmark />
          </Link>
        </div>
        <Card className="p-8 text-center">
          <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl border border-mint/40 bg-ink">
            <span className="size-3 rounded-full bg-mint shadow-[0_0_20px_4px_var(--color-mint)]" />
          </div>
          <p className="font-mono text-xs tracking-[0.35em] text-mint">PAYMENT RECEIVED</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Thank you</h1>
          <p className="mt-2 text-sm text-muted">
            {!billing ? (
              <Spinner className="mx-auto mt-2 size-4 text-signal" />
            ) : billing.subscriptionStatus === 'active' ? (
              'Your subscription is active.'
            ) : (
              'Finalizing your subscription…'
            )}
          </p>

          {billing?.licenseKey && (
            <div className="mt-5 rounded-xl border border-line bg-ink p-4">
              <p className="text-[11px] font-medium tracking-widest text-faint uppercase">Your access key</p>
              <code className="mt-1.5 block font-mono text-sm text-paper">{billing.licenseKey}</code>
            </div>
          )}

          <Link href="/dashboard" className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-signal px-6 text-sm font-semibold text-ink hover:bg-[#ff6a33]">
            Go to dashboard
          </Link>
        </Card>
      </div>
    </main>
  );
}
