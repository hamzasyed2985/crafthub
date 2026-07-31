'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Input } from '@crafthub/ui';
import { register } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ email, password, name: name || undefined });
      router.push('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '3rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '0.25rem' }}>
        Join CraftHub
      </h1>
      <p style={{ color: 'var(--fg-muted)', marginTop: 0, marginBottom: '1.5rem' }}>
        Create a buyer account. Vendor apply comes in Phase 1.
      </p>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
        {error ? <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p> : null}
        <Button type="submit" loading={loading}>
          Create account
        </Button>
      </form>
      <p style={{ marginTop: '1.25rem', color: 'var(--fg-subtle)' }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
