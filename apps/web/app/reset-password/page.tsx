'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell } from '../../components/auth-shell';
import { Alert, Button, TextField } from '../../components/ui';
import { authApi, ApiError } from '../../lib/api';

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.replace('/login'), 1800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  if (!token) {
    return <Alert>This reset link is missing its token. Please request a new one.</Alert>;
  }

  if (done) {
    return <Alert tone="success">Password updated. Redirecting you to sign in…</Alert>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <TextField
        label="New password"
        name="password"
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="At least 8 characters"
        autoComplete="new-password"
      />
      <TextField
        label="Confirm password"
        name="confirm"
        type="password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Re-enter your password"
        autoComplete="new-password"
      />
      <Button type="submit" loading={submitting} className="w-full">
        Update password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password you don't use anywhere else."
      footer={
        <Link href="/login" className="font-medium text-signal hover:underline">
          Back to sign in
        </Link>
      }
    >
      <Suspense fallback={<div className="text-sm text-muted">Loading…</div>}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
