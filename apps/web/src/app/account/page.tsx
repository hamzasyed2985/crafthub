'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@crafthub/ui';
import { PageLoader } from '@/components/page-loader';
import { Page } from '@/components/page';
import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { formatStatusLabel } from '@/lib/format-status';

type HubLink = {
  href: string;
  title: string;
  description: string;
};

function HubCard({ href, title, description }: HubLink) {
  return (
    <Link
      href={href}
      className="flex h-full flex-col rounded-md border border-border bg-elevated/60 p-5 transition-colors hover:border-accent hover:bg-elevated"
    >
      <p className="font-display text-lg">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <span className="mt-auto pt-4 text-sm text-accent">Open →</span>
    </Link>
  );
}

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
      <Page size="wide" y="md">
        <PageLoader label="Loading account…" />
      </Page>
    );
  }

  if (!user) {
    return (
      <Page size="wide" y="md">
        <div className="mx-auto max-w-lg">
          <h1 className="font-display text-3xl">Account</h1>
          <p className="mt-2 text-muted">Sign in to view your profile, orders, and seller tools.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login">
              <Button>Log in</Button>
            </Link>
            <Link href="/register">
              <Button variant="secondary">Join</Button>
            </Link>
          </div>
        </div>
      </Page>
    );
  }

  const hubLinks: HubLink[] = [
    {
      href: '/account/orders',
      title: 'Your orders',
      description: 'Track purchases, payment status, and order details.',
    },
  ];

  if (user.role === 'vendor' || vendor) {
    hubLinks.push({
      href: vendor?.status === 'approved' ? '/vendor' : '/vendor/onboarding',
      title: vendor?.status === 'approved' ? 'Seller dashboard' : 'Seller onboarding',
      description:
        vendor?.status === 'approved'
          ? 'Orders to fulfill, products, earnings, and shop settings.'
          : 'Finish Stripe Connect, branding, and your first listing.',
    });
  }

  if (user.role === 'admin') {
    hubLinks.push({
      href: '/admin',
      title: 'Admin dashboard',
      description: 'Vendors, orders, finance, and platform settings.',
    });
  }

  if (user.role === 'customer' && !vendor) {
    hubLinks.push({
      href: '/vendor/apply',
      title: 'Apply as a maker',
      description: 'Open your shop and sell handmade goods on CraftHub.',
    });
  }

  hubLinks.push(
    {
      href: '/explore',
      title: 'Explore catalog',
      description: 'Browse handmade pieces from approved makers.',
    },
    {
      href: '/cart',
      title: 'Your cart',
      description: 'Review items before checkout.',
    },
  );

  const initial = (user.name?.trim() || user.email).slice(0, 1).toUpperCase();

  return (
    <Page size="wide" y="md">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl">Account</h1>
          <p className="mt-1 text-muted">Manage your profile, orders, and seller access.</p>
        </div>
        <Button variant="secondary" disabled={loggingOut} onClick={() => void onLogout()}>
          {loggingOut ? 'Signing out…' : 'Log out'}
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr] lg:items-start">
        <section className="rounded-md border border-border bg-elevated/60 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-muted font-display text-xl text-accent">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name ?? 'CraftHub member'}</p>
              <p className="truncate text-sm text-muted">{user.email}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2.5 text-sm">
            <dt className="text-subtle">Role</dt>
            <dd className="m-0">{formatStatusLabel(user.role)}</dd>
            <dt className="text-subtle">Status</dt>
            <dd className="m-0">{formatStatusLabel(user.status)}</dd>
            {vendor ? (
              <>
                <dt className="text-subtle">Shop</dt>
                <dd className="m-0">
                  <Link href={`/shops/${vendor.slug}`} className="text-accent hover:underline">
                    {vendor.displayName}
                  </Link>
                  <span className="text-muted"> · {formatStatusLabel(vendor.status)}</span>
                </dd>
              </>
            ) : null}
          </dl>
        </section>

        <section>
          <h2 className="font-display text-xl">Quick links</h2>
          <p className="mt-1 text-sm text-muted">Jump to the parts of CraftHub you use most.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {hubLinks.map((link) => (
              <HubCard key={link.href} {...link} />
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}
