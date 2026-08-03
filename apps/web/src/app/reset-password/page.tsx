'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Input } from '@crafthub/ui';
import { Page } from '@/components/page';
import { resetPassword } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError('Missing reset token. Use the link from your email.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ token, password });
      router.push('/login?reason=password_reset');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page size="narrow" y="none" className="mt-12">
      <h1 className="mb-1 font-display text-3xl">Reset password</h1>
      <p className="mb-6 mt-0 text-muted">Choose a new password for your account.</p>

      {!token ? (
        <p className="mb-4 text-danger">
          This page needs a valid reset token. Request a new link from{' '}
          <Link href="/forgot-password">forgot password</Link>.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label="New password"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            label="Confirm password"
            type="password"
            name="confirm"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error ? <p className="m-0 text-danger">{error}</p> : null}
          <Button type="submit" loading={loading}>
            Update password
          </Button>
        </form>
      )}

      <p className="mt-5 text-subtle">
        <Link href="/login">Back to log in</Link>
      </p>
    </Page>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Page size="narrow" y="none" className="mt-12">
          <p className="text-subtle">Loading…</p>
        </Page>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
