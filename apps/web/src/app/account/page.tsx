'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@crafthub/ui';
import { fetchMe, logout, type AuthUser, type VendorSummary } from '@/lib/api';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [vendor, setVendor] = useState<VendorSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetchMe()
      .then((d) => {
        setUser(d.user);
        setVendor(d.vendor);
      })
      .catch(() => setError('Sign in to view your account.'));
  }, []);

  async function onLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.push('/');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

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
      <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2">
        <dt className="text-subtle">Name</dt>
        <dd className="m-0">{user.name ?? '—'}</dd>
        <dt className="text-subtle">Role</dt>
        <dd className="m-0">{user.role}</dd>
        <dt className="text-subtle">Status</dt>
        <dd className="m-0">{user.status}</dd>
      </dl>
      <p className="mt-6">
        <Link href="/account/orders" className="text-accent">
          View your orders
        </Link>
      </p>
      {vendor ? (
        <p className="mt-6 text-sm">
          Vendor shop: <strong>{vendor.displayName}</strong> ({vendor.status}) —{' '}
          <Link href="/vendor" className="text-accent">
            Dashboard
          </Link>
        </p>
      ) : user.role !== 'admin' ? (
        <p className="mt-6 text-sm">
          <Link href="/vendor/apply" className="text-accent">
            Apply to sell on CraftHub
          </Link>
        </p>
      ) : null}
      <div className="mt-8">
        <Button variant="secondary" disabled={loggingOut} onClick={() => void onLogout()}>
          {loggingOut ? 'Signing out…' : 'Log out'}
        </Button>
      </div>
    </div>
  );
}
