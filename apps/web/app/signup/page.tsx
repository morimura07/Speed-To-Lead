'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell } from '../../components/auth-shell';
import { Alert, Button, Checkbox, TextField } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { ApiError } from '../../lib/api';

export default function SignupPage() {
  const router = useRouter();
  const { status, signup } = useAuth();

  const [form, setForm] = useState({
    companyName: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    licenseKey: '',
  });
  const [smsConsent, setSmsConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authed') router.replace('/dashboard');
  }, [status, router]);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup({ ...form, smsConsent });
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Start your free trial"
      subtitle="30 days of LeadArrow. Enter the access key you were issued to begin."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-signal hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <TextField
          label="Access key"
          name="licenseKey"
          required
          value={form.licenseKey}
          onChange={update('licenseKey')}
          placeholder="LA-XXXX-XXXX-XXXX"
          autoComplete="off"
        />
        <TextField
          label="Company name"
          name="companyName"
          required
          value={form.companyName}
          onChange={update('companyName')}
          placeholder="Acme Sales Co."
        />
        <TextField
          label="Your name"
          name="fullName"
          required
          value={form.fullName}
          onChange={update('fullName')}
          placeholder="Jordan Rivera"
          autoComplete="name"
        />
        <TextField
          label="Work email"
          name="email"
          type="email"
          required
          value={form.email}
          onChange={update('email')}
          placeholder="you@company.com"
          autoComplete="email"
        />
        <TextField
          label="Phone number"
          name="phone"
          type="tel"
          required
          value={form.phone}
          onChange={update('phone')}
          placeholder="+1 555 010 0100"
          autoComplete="tel"
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          required
          minLength={8}
          value={form.password}
          onChange={update('password')}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
        <Checkbox
          name="smsConsent"
          checked={smsConsent}
          onChange={(e) => setSmsConsent(e.target.checked)}
          label="I agree to receive calls and SMS notifications about incoming leads at the phone number provided."
        />
        <p className="text-xs leading-relaxed text-muted">
          Consent is optional and not a condition of purchase. Message frequency varies, and message
          and data rates may apply. Reply STOP to unsubscribe or HELP for help. See our{' '}
          <Link href="/privacy" className="text-signal hover:underline">
            Privacy Policy
          </Link>{' '}
          and{' '}
          <Link href="/terms" className="text-signal hover:underline">
            Terms
          </Link>
          .
        </p>
        <Button type="submit" loading={submitting} className="w-full">
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
