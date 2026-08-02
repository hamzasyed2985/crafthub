'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@crafthub/ui';
import { Page } from '@/components/page';
import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { formatStatusLabel } from '@/lib/format-status';

export default function AccountPage() {
  const router = useRouter();
  const { user, vendor, loading, logout, refresh } = useAuth();
  const { refresh: refreshCart } = useCart();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onLogout() {
    setLoggingOut(true);
    try {
      await logout();
      await refreshCart().catch(() => undefined);
      router.push('/');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  if (loading && !user) {
    return (
      <Page size="narrow" y="none" className="mt-12">
        <p className="text-subtle">Loading…</p>
      </Page>
    );
  }

  if (!user) {
    return (
      <Page size="narrow" y="none" className="mt-12">
        <h1 className="font-display text-3xl">Account</h1>
        <p className="mt-2 text-muted">Sign in to view your profile and orders.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/login">
            <Button>Log in</Button>
          </Link>
          <Link href="/register">
            <Button variant="secondary">Join</Button>
          </Link>
        </div>
      </Page>
    );
  }

  return (
    <Page size="narrow" y="none" className="mt-12">
      <h1 className="font-display text-3xl">Account</h1>
      <p className="mt-2 text-muted">
        Signed in as <strong>{user.email}</strong>
      </p>

      <dl className="mt-6 grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-subtle">Name</dt>
        <dd className="m-0">{user.name ?? '—'}</dd>
        <dt className="text-subtle">Role</dt>
        <dd className="m-0">{formatStatusLabel(user.role)}</dd>
        <dt className="text-subtle">Status</dt>
        <dd className="m-0">{formatStatusLabel(user.status)}</dd>
        {vendor ? (
          <>
            <dt className="text-subtle">Shop</dt>
            <dd className="m-0">
              {vendor.displayName} · {formatStatusLabel(vendor.status)}
            </dd>
          </>
        ) : null}
      </dl>

      <nav className="mt-8 space-y-2 border-t border-border pt-6 text-sm">
        <Link href="/account/orders" className="block text-accent hover:underline">
          Your orders
        </Link>
        {user.role === 'vendor' || vendor ? (
          <Link href="/vendor" className="block text-accent hover:underline">
            Seller dashboard
          </Link>
        ) : null}
        {user.role === 'admin' ? (
          <Link href="/admin" className="block text-accent hover:underline">
            Dashboard
          </Link>
        ) : null}
        {user.role === 'customer' && !vendor ? (
          <Link href="/vendor/apply" className="block text-accent hover:underline">
            Apply as a maker
          </Link>
        ) : null}
      </nav>

      <div className="mt-10">
        <Button variant="secondary" disabled={loggingOut} onClick={() => void onLogout()}>
          {loggingOut ? 'Signing out…' : 'Log out'}
        </Button>
      </div>
    </Page>
  );
}
