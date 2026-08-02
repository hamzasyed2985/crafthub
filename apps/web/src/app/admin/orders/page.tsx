'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Price } from '@crafthub/ui';
import { fetchAdminOrders, type AdminOrderRow } from '@/lib/api';

export default function AdminOrdersPage() {
  const [status, setStatus] = useState('');
  const [orders, setOrders] = useState<AdminOrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrders(null);
    fetchAdminOrders(status || undefined)
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, [status]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Orders</h1>
        <Link href="/admin" className="text-sm text-accent">
          Overview
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {['', 'paid', 'processing', 'refunded', 'pending_payment'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              status === s ? 'border-accent bg-accent-muted' : 'border-border'
            }`}
          >
            {s || 'all'}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 text-danger">{error}</p> : null}
      {!orders ? <p className="mt-8 text-subtle">Loading…</p> : null}

      {orders ? (
        <ul className="mt-8 divide-y divide-border">
          {orders.map((o) => (
            <li key={o.id} className="py-4">
              <Link href={`/admin/orders/${o.id}`} className="block hover:text-accent">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold">
                    {o.status} · {o.buyer.email}
                  </p>
                  <Price cents={o.totalCents} />
                </div>
                <p className="text-sm text-subtle">
                  {new Date(o.createdAt).toLocaleString()} · {o.vendorOrderCount} vendor slice(s) ·
                  payment {o.paymentStatus ?? '—'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
