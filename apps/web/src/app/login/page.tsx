'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Input } from '@crafthub/ui';
import { login } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      router.push('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '3rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '0.25rem' }}>
        Log in
      </h1>
      <p style={{ color: 'var(--fg-muted)', marginTop: 0, marginBottom: '1.5rem' }}>
        Welcome back to CraftHub.
      </p>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
        {error ? <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p> : null}
        <Button type="submit" loading={loading}>
          Log in
        </Button>
      </form>
      <p style={{ marginTop: '1.25rem', color: 'var(--fg-subtle)' }}>
        New here? <Link href="/register">Create an account</Link>
      </p>
    </div>
  );
}
