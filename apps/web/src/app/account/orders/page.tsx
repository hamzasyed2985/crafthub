'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Price } from '@crafthub/ui';
import { PageLoader } from '@/components/page-loader';
import { Page } from '@/components/page';
import { PaginationControls } from '@/components/pagination-controls';
import { fetchOrders, readAccessToken, type OrderDto } from '@/lib/api';
import { formatBuyerOrderStatus, formatOrderNumber } from '@/lib/format-status';

function orderSummary(order: OrderDto): string {
  const itemCount = order.vendorOrders.reduce(
    (n, vo) => n + vo.items.reduce((m, item) => m + item.quantity, 0),
    0,
  );
  const makers = [...new Set(order.vendorOrders.map((vo) => vo.vendor.displayName))];
  const itemLabel = `${itemCount} item${itemCount === 1 ? '' : 's'}`;
  if (makers.length === 0) return itemLabel;
  if (makers.length === 1) return `${itemLabel} from ${makers[0]}`;
  if (makers.length === 2) return `${itemLabel} from ${makers[0]} and ${makers[1]}`;
  return `${itemLabel} from ${makers[0]} and ${makers.length - 1} other makers`;
}

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
      <Page size="wide">
        <p className="text-danger">{error}</p>
        <Link href="/login" className="text-accent">
          Log in
        </Link>
      </Page>
    );
  }

  if (!orders)
    return (
      <Page size="wide">
        <PageLoader label="Loading orders…" />
      </Page>
    );

  return (
    <Page size="wide">
      <h1 className="font-display text-3xl">Your orders</h1>
      <p className="mt-1 text-muted">Track purchases and open a receipt for details.</p>

      {orders.length === 0 ? (
        <p className="mt-8 text-muted">
          No orders yet.{' '}
          <Link href="/explore" className="text-accent hover:underline">
            Explore makers
          </Link>
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-border border-t border-border">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/account/orders/${o.id}`}
                className="flex flex-col gap-3 py-5 transition-colors hover:bg-elevated/40 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-display text-lg text-foreground">
                      {formatBuyerOrderStatus(o.status)}
                    </p>
                    <p className="text-sm tabular-nums text-subtle">{formatOrderNumber(o.id)}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {new Date(o.createdAt).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    <span className="text-subtle"> · </span>
                    {orderSummary(o)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
                  <p className="font-semibold tabular-nums">
                    <Price cents={o.totalCents} />
                  </p>
                  <span className="text-sm text-accent">View details →</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <PaginationControls page={page} limit={limit} total={total} onPageChange={setPage} />
    </Page>
  );
}
