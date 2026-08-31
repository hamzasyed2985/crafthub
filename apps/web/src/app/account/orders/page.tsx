'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Price } from '@crafthub/ui';
import { Page } from '@/components/page';
import { PaginationControls } from '@/components/pagination-controls';
import { fetchOrders, readAccessToken, type OrderDto } from '@/lib/api';
import { formatBuyerOrderStatus } from '@/lib/format-status';

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<OrderDto[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(24);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!readAccessToken()) {
      setError('Please log in');
      return;
    }
    fetchOrders(page, 24)
      .then((res) => {
        setOrders(res.data);
        setTotal(res.meta.total);
        setLimit(res.meta.limit);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, [page]);

  if (error) {
    return (
      <Page size="reading">
        <p className="text-danger">{error}</p>
        <Link href="/login" className="text-accent">
          Log in
        </Link>
      </Page>
    );
  }

  if (!orders)
    return (
      <Page size="reading">
        <p className="text-subtle">Loading orders…</p>
      </Page>
    );

  return (
    <Page size="reading">
      <h1 className="font-display text-3xl">Your orders</h1>
      {orders.length === 0 ? (
        <p className="mt-4 text-muted">No orders yet.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="border-b border-border pb-4">
              <Link href={`/account/orders/${o.id}`} className="font-semibold hover:text-accent">
                Order {o.id.slice(0, 8)}… · {formatBuyerOrderStatus(o.status)}
              </Link>
              <p className="text-sm text-muted">
                {new Date(o.createdAt).toLocaleString()} · <Price cents={o.totalCents} />
              </p>
            </li>
          ))}
        </ul>
      )}
      <PaginationControls page={page} limit={limit} total={total} onPageChange={setPage} />
    </Page>
  );
}
