'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Price } from '@crafthub/ui';
import { fetchVendorEarnings, type VendorEarningsDto } from '@/lib/api';

export default function VendorEarningsPage() {
  const [earnings, setEarnings] = useState<VendorEarningsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVendorEarnings()
      .then(setEarnings)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-danger">{error}</p>
        <Link href="/vendor" className="text-accent">
          Dashboard
        </Link>
      </div>
    );
  }

  if (!earnings) return <p className="px-6 py-12 text-subtle">Loading earnings…</p>;

  const stats = [
    { label: 'Gross sales', cents: earnings.grossSalesCents },
    { label: 'Commission', cents: earnings.commissionCents },
    { label: 'Net', cents: earnings.netCents },
    { label: 'Shipping collected', cents: earnings.shippingCents },
    { label: 'Pending payout', cents: earnings.pendingPayoutCents },
    { label: 'Paid out', cents: earnings.paidOutCents },
    { label: 'Net (7d)', cents: earnings.last7dNetCents },
    { label: 'Net (30d)', cents: earnings.last30dNetCents },
    { label: 'Outstanding debt', cents: earnings.outstandingDebtCents ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Earnings</h1>
        <Link href="/vendor" className="text-sm text-accent">
          Dashboard
        </Link>
      </div>
      <p className="mt-2 text-muted">Totals from paid and later order slices (not live Stripe balance).</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md border border-border bg-elevated p-4">
            <p className="text-sm text-subtle">{s.label}</p>
            <p className="font-display text-2xl">
              <Price cents={s.cents} />
            </p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-display text-2xl">Recent transfers</h2>
      {earnings.recentTransfers.length === 0 ? (
        <p className="mt-4 text-subtle">No transfers yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-subtle">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2">Order</th>
              </tr>
            </thead>
            <tbody>
              {earnings.recentTransfers.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="py-2 pr-4">{new Date(t.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-4">{t.status}</td>
                  <td className="py-2 pr-4">
                    <Price cents={t.amountCents} />
                  </td>
                  <td className="py-2">
                    <Link href={`/vendor/orders/${t.vendorOrderId}`} className="text-accent">
                      View slice
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
