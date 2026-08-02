'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Price } from '@crafthub/ui';
import { fetchVendorOrders, type VendorOrderDto } from '@/lib/api';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'fulfilling', label: 'Fulfilling' },
  { key: 'shipped', label: 'Shipped' },
] as const;

export default function VendorOrdersClient() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') ?? '';
  const [orders, setOrders] = useState<VendorOrderDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrders(null);
    fetchVendorOrders(status || undefined)
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, [status]);

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

  if (!orders) return <p className="px-6 py-12 text-subtle">Loading orders…</p>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Orders</h1>
        <Link href="/vendor" className="text-sm text-accent">
          Dashboard
        </Link>
      </div>
      <p className="mt-2 text-muted">Paid orders appear after Stripe webhook confirmation.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const href = f.key ? `/vendor/orders?status=${f.key}` : '/vendor/orders';
          const active = status === f.key;
          return (
            <Link
              key={f.key || 'all'}
              href={href}
              className={`rounded-md px-3 py-1.5 text-sm ${
                active
                  ? 'bg-ink text-canvas'
                  : 'border border-border text-muted hover:border-ink'
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <p className="mt-8 text-subtle">No orders yet.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((vo) => (
            <li key={vo.id}>
              <Link
                href={`/vendor/orders/${vo.id}`}
                className="block rounded-md border border-border bg-elevated p-4 hover:border-ink"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold">
                    {vo.status} · {vo.order.shipName} ({vo.order.shipCity})
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
    </div>
  );
}
