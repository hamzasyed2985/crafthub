'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Input } from '@crafthub/ui';
import { Page } from '@/components/page';
import { register } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/login')) {
    return '/account';
  }
  return raw;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextPath = safeNextPath(searchParams.get('next'));
  const sellIntent = nextPath.startsWith('/vendor/apply');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ email, password, name: name || undefined });
      await refresh();
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page size="narrow" y="none" className="mt-12">
      <h1 className="mb-1 font-display text-3xl">Join CraftHub</h1>
      <p className="mb-6 mt-0 text-muted">
        {sellIntent
          ? 'Create an account, then apply to sell as a maker.'
          : 'Create a buyer account to shop and track orders.'}
      </p>
      {sellIntent ? (
        <p className="mb-4 rounded-md border border-border bg-accent-muted/40 px-3 py-2 text-sm text-foreground">
          After you join, you’ll continue to the maker application.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label="Name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          autoComplete="new-password"
          hint="At least 8 characters"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="m-0 text-danger">{error}</p> : null}
        <Button type="submit" loading={loading}>
          Create account
        </Button>
      </form>
      <p className="mt-5 text-subtle">
        Already have an account?{' '}
        <Link
          href={
            nextPath !== '/account'
              ? `/login?reason=sell&next=${encodeURIComponent(nextPath)}`
              : '/login'
          }
        >
          Log in
        </Link>
      </p>
    </Page>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <Page size="narrow" y="none" className="mt-12">
          <p className="text-subtle">Loading…</p>
        </Page>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
