'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Price } from '@crafthub/ui';
import { ListRowSkeleton } from '@/components/list-row-skeleton';
import { Page } from '@/components/page';
import { PaginationControls } from '@/components/pagination-controls';
import { fetchAdminOrders, type AdminOrderRow } from '@/lib/api';
import { formatStatusLabel } from '@/lib/format-status';

export default function AdminOrdersPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<AdminOrderRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(24);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrders(null);
    fetchAdminOrders(status || undefined, page, 24)
      .then((res) => {
        setOrders(res.data);
        setTotal(res.meta.total);
        setLimit(res.meta.limit);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, [status, page]);

  return (
    <Page size="wide">
      <h1 className="font-display text-3xl">Orders</h1>
      <p className="mt-1 text-muted">All marketplace orders</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {['', 'paid', 'processing', 'refunded', 'pending_payment'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              status === s ? 'border-accent bg-accent-muted' : 'border-border'
            }`}
          >
            {formatStatusLabel(s)}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 text-danger">{error}</p> : null}
      {!orders ? <ListRowSkeleton rows={8} columns={4} /> : null}

      {orders ? (
        <>
          <ul className="mt-8 divide-y divide-border">
            {orders.map((o) => (
              <li key={o.id} className="py-4">
                <Link href={`/admin/orders/${o.id}`} className="block hover:text-accent">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-semibold">
                      {formatStatusLabel(o.status)} · {o.buyer.email}
                    </p>
                    <Price cents={o.totalCents} />
                  </div>
                  <p className="text-sm text-subtle">
                    {new Date(o.createdAt).toLocaleString()} · {o.vendorOrderCount} vendor slice(s) ·
                    payment {o.paymentStatus ? formatStatusLabel(o.paymentStatus) : '—'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <PaginationControls page={page} limit={limit} total={total} onPageChange={setPage} />
        </>
      ) : null}
    </Page>
  );
}
