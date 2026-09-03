'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Price } from '@crafthub/ui';
import { PageLoader } from '@/components/page-loader';
import { Page } from '@/components/page';
import { PaginationControls } from '@/components/pagination-controls';
import { fetchVendorOrders, type VendorOrderDto } from '@/lib/api';
import { formatStatusLabel } from '@/lib/format-status';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'fulfilling', label: 'Fulfilling' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
] as const;

export default function VendorOrdersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status') ?? '';
  const [orders, setOrders] = useState<VendorOrderDto[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(24);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    setOrders(null);
    fetchVendorOrders(status || undefined, page, 24)
      .then((res) => {
        setOrders(res.data);
        setTotal(res.meta.total);
        setLimit(res.meta.limit);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, [status, page]);

  if (error) {
    return (
      <Page size="wide">
        <p className="text-danger">{error}</p>
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
      <h1 className="font-display text-3xl">Orders</h1>
      <p className="mt-2 text-muted">Paid orders appear after Stripe webhook confirmation.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = status === f.key;
          return (
            <button
              key={f.key || 'all'}
              type="button"
              onClick={() => {
                setPage(1);
                router.push(f.key ? `/vendor/orders?status=${f.key}` : '/vendor/orders');
              }}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                active ? 'border-accent bg-accent-muted' : 'border-border'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <p className="mt-8 text-subtle">No orders yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-border">
          {orders.map((vo) => (
            <li key={vo.id} className="py-4">
              <Link href={`/vendor/orders/${vo.id}`} className="block hover:text-accent">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold">
                    {formatStatusLabel(vo.status)} · {vo.order.shipName} ({vo.order.shipCity})
                  </p>
                  <p>
                    Net <Price cents={vo.vendorNetCents} />
                  </p>
                </div>
                <p className="text-sm text-subtle">
                  {new Date(vo.order.createdAt).toLocaleString()} · commission{' '}
                  <Price cents={vo.commissionCents} />
                </p>
                <ul className="mt-2 text-sm text-muted">
                  {vo.items.map((item) => (
                    <li key={item.id}>
                      {item.quantity}× {item.title}
                    </li>
                  ))}
                </ul>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <PaginationControls page={page} limit={limit} total={total} onPageChange={setPage} />
    </Page>
  );
}
