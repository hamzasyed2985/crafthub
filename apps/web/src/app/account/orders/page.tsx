'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Price } from '@crafthub/ui';
import { fetchOrders, readAccessToken, type OrderDto } from '@/lib/api';

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<OrderDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!readAccessToken()) {
      setError('Please log in');
      return;
    }
    fetchOrders()
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-danger">{error}</p>
        <Link href="/login" className="text-accent">
          Log in
        </Link>
      </div>
    );
  }

  if (!orders) return <p className="px-6 py-12 text-subtle">Loading orders…</p>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl">Your orders</h1>
      {orders.length === 0 ? (
        <p className="mt-4 text-muted">No orders yet.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="border-b border-border pb-4">
              <Link href={`/account/orders/${o.id}`} className="font-semibold hover:text-accent">
                Order {o.id.slice(0, 8)}… · {o.status}
              </Link>
              <p className="text-sm text-muted">
                {new Date(o.createdAt).toLocaleString()} · <Price cents={o.totalCents} />
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
