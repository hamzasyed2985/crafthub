'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Input } from '@crafthub/ui';
import { Page } from '@/components/page';
import { forgotPassword } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page size="narrow" y="none" className="mt-12">
      <h1 className="mb-1 font-display text-3xl">Forgot password</h1>
      <p className="mb-6 mt-0 text-muted">
        Enter your email and we&apos;ll send a reset link if an account exists.
      </p>

      {done ? (
        <p className="mb-4 rounded-md border border-border bg-accent-muted/40 px-3 py-2 text-sm text-foreground">
          If that email is registered, you will receive reset instructions shortly. Check your
          inbox (and server logs in local mock email mode).
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error ? <p className="m-0 text-danger">{error}</p> : null}
          <Button type="submit" loading={loading}>
            Send reset link
          </Button>
        </form>
      )}

      <p className="mt-5 text-subtle">
        <Link href="/login">Back to log in</Link>
      </p>
    </Page>
  );
}
