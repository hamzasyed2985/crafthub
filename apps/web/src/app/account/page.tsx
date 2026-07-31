'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchMe, type AuthUser } from '@/lib/api';

export default function AccountPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setError('Sign in to view your account.'));
  }, []);

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: '3rem auto', padding: '0 1.5rem' }}>
        <p>{error}</p>
        <Link href="/login">Log in</Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ maxWidth: 480, margin: '3rem auto', padding: '0 1.5rem' }}>
        <p style={{ color: 'var(--fg-subtle)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '3rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem' }}>Account</h1>
      <p style={{ color: 'var(--fg-muted)' }}>
        Signed in as <strong>{user.email}</strong>
      </p>
      <dl style={{ display: 'grid', gridTemplateColumns: '8rem 1fr', gap: '0.5rem 1rem' }}>
        <dt style={{ color: 'var(--fg-subtle)' }}>Name</dt>
        <dd style={{ margin: 0 }}>{user.name ?? '—'}</dd>
        <dt style={{ color: 'var(--fg-subtle)' }}>Role</dt>
        <dd style={{ margin: 0 }}>{user.role}</dd>
        <dt style={{ color: 'var(--fg-subtle)' }}>Status</dt>
        <dd style={{ margin: 0 }}>{user.status}</dd>
      </dl>
    </div>
  );
}
