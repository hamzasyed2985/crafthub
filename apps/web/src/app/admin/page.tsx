'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Price } from '@crafthub/ui';
import { Page } from '@/components/page';
import { SimplePieChart } from '@/components/simple-pie-chart';
import { fetchAdminFinance, fetchAdminMetrics } from '@/lib/api';
import { formatStatusLabel } from '@/lib/format-status';
import { pieColorAt, PIE_SEMANTIC } from '@/lib/pie-colors';

const SECTIONS = [
  {
    href: '/admin/finance',
    title: 'Finance',
    blurb: 'Commission, payouts, and vendor debt',
  },
  {
    href: '/admin/orders',
    title: 'Orders',
    blurb: 'Platform orders and refunds',
  },
  {
    href: '/admin/vendors',
    title: 'Vendors',
    blurb: 'Approve, suspend, and review makers',
  },
  {
    href: '/admin/settings',
    title: 'Settings',
    blurb: 'Commission rate and debt thresholds',
  },
  {
    href: '/admin/audit-logs',
    title: 'Audit log',
    blurb: 'Who changed what, and when',
  },
] as const;

function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

type Metrics = Awaited<ReturnType<typeof fetchAdminMetrics>>;
type Finance = Awaited<ReturnType<typeof fetchAdminFinance>>['data'];

export default function AdminHomePage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [finance, setFinance] = useState<Finance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchAdminMetrics(), fetchAdminFinance().catch(() => null)])
      .then(([m, f]) => {
        setMetrics(m);
        setFinance(f?.data ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, []);

  if (error) {
    return (
      <Page size="default">
        <p className="text-danger">{error}</p>
      </Page>
    );
  }

  if (!metrics)
    return (
      <Page size="default">
        <p className="text-subtle">Loading metrics…</p>
      </Page>
    );

  const money = [
    { label: 'GMV', cents: metrics.gmvCents },
    { label: 'Platform revenue', cents: metrics.platformRevenueCents },
    { label: 'Vendor debt outstanding', cents: metrics.outstandingVendorDebtCents },
  ];

  const orderSlices = Object.entries(metrics.ordersByStatus)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label: formatStatusLabel(label),
      value,
      color: pieColorAt(i),
    }));

  const vendorSlices = Object.entries(metrics.vendorsByStatus)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label: formatStatusLabel(label),
      value,
      color: pieColorAt(i),
    }));

  const financeSplit = finance
    ? [
        {
          label: 'Platform commission',
          value: finance.totals.platformRevenueCents,
          color: PIE_SEMANTIC.accent,
        },
        {
          label: 'Paid to vendors',
          value: finance.totals.paidOutCents,
          color: PIE_SEMANTIC.positive,
        },
        {
          label: 'Vendor debt',
          value: finance.totals.outstandingVendorDebtCents,
          color: PIE_SEMANTIC.debt,
        },
      ].filter((s) => s.value > 0)
    : [];

  const topVendors = (finance?.byVendor ?? []).slice(0, 5).map((v, i) => ({
    label: v.displayName,
    value: v.commissionCents,
    color: pieColorAt(i),
  }));

  const ratePct = finance ? (finance.settings.commissionBps / 100).toFixed(1) : null;

  return (
    <Page size="default">
      <h1 className="font-display text-3xl">Dashboard</h1>
      <p className="mt-1 text-muted">Marketplace health at a glance</p>

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

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {money.map((c) => (
          <div key={c.label} className="rounded-md border border-border bg-elevated p-4">
            <p className="text-sm text-subtle">{c.label}</p>
            <p className="mt-1 font-display text-2xl">
              <Price cents={c.cents} />
            </p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3 text-sm">
        <div className="rounded-md border border-border p-4">
          <p className="text-subtle">Refunded orders</p>
          <p className="font-display text-2xl">{metrics.refundedOrders}</p>
          <p className="text-subtle">Rate {(metrics.refundRate * 100).toFixed(1)}%</p>
        </div>
        <Link
          href="/admin/vendors?status=approved"
          className="rounded-md border border-border p-4 hover:border-border-strong"
        >
          <p className="text-subtle">Vendors needing ledger review</p>
          <p className="font-display text-2xl">{metrics.vendorsNeedingLedgerReview}</p>
          <p className="mt-1 text-accent">Open vendors →</p>
        </Link>
        <Link
          href="/admin/vendors?status=pending"
          className="rounded-md border border-border p-4 hover:border-border-strong"
        >
          <p className="text-subtle">Pending applications</p>
          <p className="font-display text-2xl">{metrics.vendorsByStatus.pending ?? 0}</p>
          <p className="mt-1 text-accent">Review queue →</p>
        </Link>
      </section>

      {finance ? (
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl">Finance</h2>
              <p className="mt-1 text-sm text-muted">
                Commission rate {ratePct}% · {finance.totals.paidTransferCount} paid transfers
              </p>
            </div>
            <Link href="/admin/finance" className="text-sm text-accent">
              Finance detail →
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="rounded-md border border-border p-4">
              <p className="text-subtle">Platform revenue</p>
              <p className="font-display text-xl">
                <Price cents={finance.totals.platformRevenueCents} />
              </p>
            </div>
            <div className="rounded-md border border-border p-4">
              <p className="text-subtle">Paid to vendors</p>
              <p className="font-display text-xl">
                <Price cents={finance.totals.paidOutCents} />
              </p>
            </div>
            <div className="rounded-md border border-border p-4">
              <p className="text-subtle">GMV (items)</p>
              <p className="font-display text-xl">
                <Price cents={finance.totals.gmvCents} />
              </p>
            </div>
            <div className="rounded-md border border-border p-4">
              <p className="text-subtle">Debt threshold</p>
              <p className="font-display text-xl">
                <Price cents={finance.settings.debtReviewThresholdCents} />
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-md border border-border bg-elevated p-5">
              <h3 className="font-display text-lg">Money flow</h3>
              <p className="mt-1 text-xs text-subtle">Click a slice or legend item</p>
              <div className="mt-4">
                <SimplePieChart
                  slices={financeSplit}
                  emptyLabel="No finance data yet"
                  formatValue={formatCents}
                />
              </div>
            </div>
            <div className="rounded-md border border-border bg-elevated p-5">
              <h3 className="font-display text-lg">Top commission sources</h3>
              <p className="mt-1 text-xs text-subtle">By vendor · click to highlight</p>
              <div className="mt-4">
                <SimplePieChart
                  slices={topVendors}
                  emptyLabel="No commission yet"
                  formatValue={formatCents}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-md border border-border bg-elevated p-5">
          <h2 className="font-display text-xl">Orders by status</h2>
          <p className="mt-1 text-xs text-subtle">Click a slice or legend item</p>
          <div className="mt-4">
            <SimplePieChart slices={orderSlices} emptyLabel="No orders yet" />
          </div>
        </div>
        <div className="rounded-md border border-border bg-elevated p-5">
          <h2 className="font-display text-xl">Vendors by status</h2>
          <p className="mt-1 text-xs text-subtle">Click a slice or legend item</p>
          <div className="mt-4">
            <SimplePieChart slices={vendorSlices} emptyLabel="No vendors yet" />
          </div>
        </div>
      </section>
    </Page>
  );
}
