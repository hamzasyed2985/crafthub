'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Price } from '@crafthub/ui';
import { Page } from '@/components/page';
import { PaginationControls } from '@/components/pagination-controls';
import {
  fetchVendorEarnings,
  fetchVendorEarningsTransfers,
  type VendorEarningsDto,
  type VendorTransferDto,
} from '@/lib/api';
import { formatStatusLabel } from '@/lib/format-status';

export default function VendorEarningsPage() {
  const [earnings, setEarnings] = useState<VendorEarningsDto | null>(null);
  const [transfers, setTransfers] = useState<VendorTransferDto[] | null>(null);
  const [transferPage, setTransferPage] = useState(1);
  const [transferTotal, setTransferTotal] = useState(0);
  const [transferLimit, setTransferLimit] = useState(24);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVendorEarnings()
      .then(setEarnings)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, []);

  useEffect(() => {
    setTransfers(null);
    fetchVendorEarningsTransfers(transferPage, 24)
      .then((res) => {
        setTransfers(res.data);
        setTransferTotal(res.meta.total);
        setTransferLimit(res.meta.limit);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load transfers'));
  }, [transferPage]);

  if (error && !earnings) {
    return (
      <Page size="reading">
        <p className="text-danger">{error}</p>
      </Page>
    );
  }

  if (!earnings)
    return (
      <Page size="reading">
        <p className="text-subtle">Loading earnings…</p>
      </Page>
    );

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
    <Page size="reading">
      <h1 className="font-display text-3xl">Earnings</h1>
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

      <h2 className="mt-12 font-display text-2xl">Transfer history</h2>
      {!transfers ? (
        <p className="mt-4 text-subtle">Loading transfers…</p>
      ) : transfers.length === 0 ? (
        <p className="mt-4 text-subtle">No transfers yet.</p>
      ) : (
        <>
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
                {transfers.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="py-2 pr-4">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-4">{formatStatusLabel(t.status)}</td>
                    <td className="py-2 pr-4">
                      <Price cents={t.amountCents} currency={t.currency} />
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
          <PaginationControls
            page={transferPage}
            limit={transferLimit}
            total={transferTotal}
            onPageChange={setTransferPage}
          />
        </>
      )}
    </Page>
  );
}
