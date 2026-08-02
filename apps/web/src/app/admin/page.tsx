'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Price } from '@crafthub/ui';
import { fetchAdminMetrics } from '@/lib/api';

export default function AdminHomePage() {
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof fetchAdminMetrics>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminMetrics()
      .then(setMetrics)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  if (!metrics) return <p className="px-6 py-12 text-subtle">Loading metrics…</p>;

  const cards = [
    { label: 'GMV', cents: metrics.gmvCents },
    { label: 'Platform revenue', cents: metrics.platformRevenueCents },
    { label: 'Vendor debt outstanding', cents: metrics.outstandingVendorDebtCents },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-3xl">Admin</h1>
      <p className="mt-1 text-muted">Marketplace finance overview</p>

      <nav className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/admin/orders" className="text-accent">
          Orders
        </Link>
        <Link href="/admin/vendors" className="text-accent">
          Vendors
        </Link>
        <Link href="/admin/settings" className="text-accent">
          Settings
        </Link>
        <Link href="/admin/audit-logs" className="text-accent">
          Audit log
        </Link>
      </nav>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-md border border-border bg-elevated p-4">
            <p className="text-sm text-subtle">{c.label}</p>
            <p className="font-display text-2xl">
              <Price cents={c.cents} />
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3 text-sm">
        <div className="rounded-md border border-border p-4">
          <p className="text-subtle">Refunded orders</p>
          <p className="font-display text-2xl">{metrics.refundedOrders}</p>
          <p className="text-subtle">Rate {(metrics.refundRate * 100).toFixed(1)}%</p>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-subtle">Vendors needing ledger review</p>
          <p className="font-display text-2xl">{metrics.vendorsNeedingLedgerReview}</p>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-subtle">Vendors by status</p>
          <ul className="mt-2 space-y-1 text-muted">
            {Object.entries(metrics.vendorsByStatus).map(([k, v]) => (
              <li key={k}>
                {k}: {v}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
