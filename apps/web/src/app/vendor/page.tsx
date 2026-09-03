'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Price } from '@crafthub/ui';
import { PageLoader } from '@/components/page-loader';
import { Page } from '@/components/page';
import { SimplePieChart } from '@/components/simple-pie-chart';
import {
  fetchVendorDashboard,
  fetchVendorEarnings,
  type VendorDashboardDto,
  type VendorEarningsDto,
} from '@/lib/api';
import { formatStatusLabel } from '@/lib/format-status';
import { pieColorAt, PIE_SEMANTIC } from '@/lib/pie-colors';
import { isStripeConnected } from '@/lib/stripe-status';

const SECTIONS = [
  {
    href: '/vendor/orders',
    title: 'Orders',
    blurb: 'Fulfill, ship, and track buyer orders',
  },
  {
    href: '/vendor/products',
    title: 'Products',
    blurb: 'View and edit all your listings',
  },
  {
    href: '/vendor/earnings',
    title: 'Earnings',
    blurb: 'Sales, commission, payouts, and debt',
  },
  {
    href: '/vendor/shop',
    title: 'Shop',
    blurb: 'Branding, shipping, and policies',
  },
  {
    href: '/vendor/products/new',
    title: 'New product',
    blurb: 'Add a listing with photos and stock',
  },
  {
    href: '/vendor/onboarding',
    title: 'Onboarding',
    blurb: 'Stripe Connect and go-live checklist',
  },
] as const;

function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function VendorDashboardPage() {
  const [dash, setDash] = useState<VendorDashboardDto | null>(null);
  const [earnings, setEarnings] = useState<VendorEarningsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchVendorDashboard(), fetchVendorEarnings().catch(() => null)])
      .then(([d, e]) => {
        setDash(d);
        setEarnings(e);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, []);

  if (error) {
    const pending = /must be approved|not approved/i.test(error);
    return (
      <Page size="wide">
        <p>{error}</p>
        <Link href={pending ? '/vendor/onboarding' : '/vendor/apply'} className="text-accent">
          {pending ? 'View onboarding' : 'Apply to sell'}
        </Link>
      </Page>
    );
  }

  if (!dash)
    return (
      <Page size="wide">
        <PageLoader />
      </Page>
    );

  const vendor = dash.vendor;
  const status = String(vendor.status);
  const stripe = vendor.stripe as
    | { chargesEnabled?: boolean; onboardingComplete?: boolean }
    | null
    | undefined;
  const stripeIncomplete = status === 'approved' && !isStripeConnected(stripe);

  const orderSlices = Object.entries(dash.ordersByStatus ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label: formatStatusLabel(label),
      value,
      color: pieColorAt(i),
    }));

  const moneySlices = earnings
    ? [
        { label: 'Your net', value: earnings.netCents, color: PIE_SEMANTIC.positive },
        { label: 'Platform commission', value: earnings.commissionCents, color: PIE_SEMANTIC.accent },
        { label: 'Shipping collected', value: earnings.shippingCents, color: PIE_SEMANTIC.muted },
      ].filter((s) => s.value > 0)
    : [];

  const payoutSlices = earnings
    ? [
        { label: 'Paid out', value: earnings.paidOutCents, color: PIE_SEMANTIC.positive },
        { label: 'Pending payout', value: earnings.pendingPayoutCents, color: PIE_SEMANTIC.caution },
        {
          label: 'Outstanding debt',
          value: earnings.outstandingDebtCents ?? 0,
          color: PIE_SEMANTIC.debt,
        },
      ].filter((s) => s.value > 0)
    : [];

  return (
    <Page size="wide">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Dashboard</h1>
          <p className="mt-1 text-muted">
            {String(vendor.displayName)} · {formatStatusLabel(status)}
            {status === 'approved' ? (
              <>
                {' '}
                ·{' '}
                <Link href={`/shops/${vendor.slug}`} className="text-accent">
                  View public shop
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <Link href="/vendor/products/new">
          <Button size="sm" disabled={status !== 'approved'}>
            New product
          </Button>
        </Link>
      </div>

      {status === 'pending' ? (
        <p className="mt-6 rounded-md border border-border bg-accent-muted/40 px-4 py-3 text-sm">
          Your application is pending. See{' '}
          <Link href="/vendor/onboarding" className="underline">
            onboarding
          </Link>{' '}
          for next steps.
        </p>
      ) : null}

      {stripeIncomplete ? (
        <p className="mt-6 rounded-md border border-border bg-accent-muted/40 px-4 py-3 text-sm">
          Stripe Connect is incomplete —{' '}
          <Link href="/vendor/onboarding" className="underline">
            finish onboarding
          </Link>{' '}
          so buyers can check out.
        </p>
      ) : status === 'approved' && isStripeConnected(stripe) ? (
        <p className="mt-6 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm">
          Stripe Connected —{' '}
          <Link href="/vendor/onboarding" className="underline">
            update payout details
          </Link>
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-subtle">Sections</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-md border border-border bg-elevated p-4 transition-colors hover:border-border-strong hover:bg-background-subtle"
            >
              <p className="font-semibold text-foreground">{s.title}</p>
              <p className="mt-1 text-sm text-muted">{s.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-border bg-elevated p-4">
          <p className="text-sm text-subtle">To fulfill</p>
          <p className="font-display text-3xl">
            <Link href="/vendor/orders?status=paid" className="hover:text-accent">
              {dash.ordersToFulfill}
            </Link>
          </p>
        </div>
        <div className="rounded-md border border-border bg-elevated p-4">
          <p className="text-sm text-subtle">Net (7d)</p>
          <p className="font-display text-3xl">
            <Price cents={dash.net7dCents} />
          </p>
        </div>
        <div className="rounded-md border border-border bg-elevated p-4">
          <p className="text-sm text-subtle">Net (30d)</p>
          <p className="font-display text-3xl">
            <Price cents={dash.net30dCents} />
          </p>
        </div>
        <Link
          href="/vendor/products"
          className="rounded-md border border-border bg-elevated p-4 hover:border-border-strong"
        >
          <p className="text-sm text-subtle">Products</p>
          <p className="font-display text-3xl">{dash.productCount ?? 0}</p>
          <p className="text-xs text-subtle">Low stock: {dash.lowStockCount ?? 0}</p>
        </Link>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-2xl">Finance</h2>
          <Link href="/vendor/earnings" className="text-sm text-accent">
            Full earnings →
          </Link>
        </div>
        {earnings ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div className="rounded-md border border-border p-4">
                <p className="text-subtle">Gross sales</p>
                <p className="font-display text-xl">
                  <Price cents={earnings.grossSalesCents} />
                </p>
              </div>
              <div className="rounded-md border border-border p-4">
                <p className="text-subtle">Commission paid</p>
                <p className="font-display text-xl">
                  <Price cents={earnings.commissionCents} />
                </p>
              </div>
              <div className="rounded-md border border-border p-4">
                <p className="text-subtle">Your net</p>
                <p className="font-display text-xl">
                  <Price cents={earnings.netCents} />
                </p>
              </div>
              <div className="rounded-md border border-border p-4">
                <p className="text-subtle">Outstanding debt</p>
                <p className="font-display text-xl">
                  <Price cents={earnings.outstandingDebtCents ?? 0} />
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-md border border-border bg-elevated p-5">
                <h3 className="font-display text-lg">Sales split</h3>
                <p className="mt-1 text-xs text-subtle">Click a slice or legend item</p>
                <div className="mt-4">
                  <SimplePieChart
                    slices={moneySlices}
                    emptyLabel="No sales yet"
                    formatValue={formatCents}
                  />
                </div>
              </div>
              <div className="rounded-md border border-border bg-elevated p-5">
                <h3 className="font-display text-lg">Payouts & debt</h3>
                <p className="mt-1 text-xs text-subtle">Click a slice or legend item</p>
                <div className="mt-4">
                  <SimplePieChart
                    slices={payoutSlices}
                    emptyLabel="No payout data yet"
                    formatValue={formatCents}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted">Earnings summary unavailable.</p>
        )}
      </section>

      <section className="mt-10 rounded-md border border-border bg-elevated p-5">
        <h2 className="font-display text-xl">Orders by status</h2>
        <p className="mt-1 text-xs text-subtle">Click a slice or legend item</p>
        <div className="mt-4">
          <SimplePieChart slices={orderSlices} emptyLabel="No orders yet" />
        </div>
      </section>
    </Page>
  );
}
