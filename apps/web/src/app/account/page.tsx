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
      <div className="mx-auto mt-12 max-w-md px-6">
        <p>{error}</p>
        <Link href="/login">Log in</Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto mt-12 max-w-md px-6">
        <p className="text-subtle">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-12 max-w-md px-6">
      <h1 className="font-display text-3xl">Account</h1>
      <p className="text-muted">
        Signed in as <strong>{user.email}</strong>
      </p>
      <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2">
        <dt className="text-subtle">Name</dt>
        <dd className="m-0">{user.name ?? '—'}</dd>
        <dt className="text-subtle">Role</dt>
        <dd className="m-0">{user.role}</dd>
        <dt className="text-subtle">Status</dt>
        <dd className="m-0">{user.status}</dd>
      </dl>
    </div>
  );
}
