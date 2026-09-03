'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Input } from '@crafthub/ui';
import { PageLoader } from '@/components/page-loader';
import { Page } from '@/components/page';
import { login } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/login')) {
    return '/account';
  }
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sessionExpired = searchParams.get('reason') === 'session_expired';
  const passwordReset = searchParams.get('reason') === 'password_reset';
  const sellIntent = searchParams.get('reason') === 'sell';
  const nextPath = safeNextPath(searchParams.get('next'));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      await refresh();
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page size="narrow" y="none" className="mt-12">
      <h1 className="mb-1 font-display text-3xl">Log in</h1>
      <p className="mb-6 mt-0 text-muted">Welcome back to CraftHub.</p>

      {sessionExpired ? (
        <p className="mb-4 rounded-md border border-border bg-accent-muted/40 px-3 py-2 text-sm text-foreground">
          Your session expired. Please log in again to continue.
        </p>
      ) : null}

      {passwordReset ? (
        <p className="mb-4 rounded-md border border-border bg-accent-muted/40 px-3 py-2 text-sm text-foreground">
          Password updated. Log in with your new password.
        </p>
      ) : null}

      {sellIntent ? (
        <p className="mb-4 rounded-md border border-border bg-accent-muted/40 px-3 py-2 text-sm text-foreground">
          Log in to apply as a maker. New here? Create an account first, then you’ll continue to the
          application.
        </p>
      ) : null}

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
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="m-0 text-right text-sm">
          <Link href="/forgot-password" className="text-muted underline-offset-2 hover:underline">
            Forgot password?
          </Link>
        </p>
        {error ? <p className="m-0 text-danger">{error}</p> : null}
        <Button type="submit" loading={loading}>
          Log in
        </Button>
      </form>
      <p className="mt-5 text-subtle">
        New here?{' '}
        <Link
          href={
            nextPath !== '/account'
              ? `/register?next=${encodeURIComponent(nextPath)}`
              : '/register'
          }
        >
          Create an account
        </Link>
      </p>
    </Page>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Page size="narrow" y="none" className="mt-12">
          <PageLoader />
        </Page>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
