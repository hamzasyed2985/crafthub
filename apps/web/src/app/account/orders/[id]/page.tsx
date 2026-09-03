'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Price } from '@crafthub/ui';
import { PageLoader } from '@/components/page-loader';
import { Page } from '@/components/page';
import { confirmOrderPayment, fetchOrder, readAccessToken, type OrderDto } from '@/lib/api';
import {
  formatBuyerOrderStatus,
  formatBuyerVendorSliceStatus,
  formatOrderNumber,
} from '@/lib/format-status';

export default function AccountOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!readAccessToken()) {
      setError('Please log in');
      return;
    }
    fetchOrder(params.id)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, [params.id]);

  async function onConfirm() {
    setBusy(true);
    setNote(null);
    try {
      const result = await confirmOrderPayment(params.id);
      setOrder(result.order);
      setNote(result.order.status === 'paid' ? 'Payment confirmed with Stripe.' : null);
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Confirm failed');
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <Page size="reading">
        <p className="text-danger">{error}</p>
      </Page>
    );
  }

  if (!order)
    return (
      <Page size="reading">
        <PageLoader />
      </Page>
    );

  return (
    <Page size="reading">
      <Link href="/account/orders" className="text-sm text-accent">
        ← All orders
      </Link>
      <h1 className="mt-4 font-display text-3xl">{formatOrderNumber(order.id)}</h1>
      <p className="mt-2 text-muted">
        <strong>{formatBuyerOrderStatus(order.status)}</strong> · <Price cents={order.totalCents} />
      </p>
      <p className="mt-1 text-sm text-subtle">
        Placed{' '}
        {new Date(order.createdAt).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>
      <p className="mt-2 text-sm text-subtle">
        Ship to {order.shipping.name}, {order.shipping.line1}, {order.shipping.city}{' '}
        {order.shipping.postalCode}
      </p>

      {order.status === 'pending_payment' ? (
        <div className="mt-4 rounded-md border border-border bg-elevated p-4">
          <p className="text-sm text-muted">
            If you already paid on Stripe, confirm below (needed when local webhooks aren’t
            running).
          </p>
          <Button className="mt-3" size="sm" disabled={busy} onClick={() => void onConfirm()}>
            {busy ? 'Checking Stripe…' : 'Confirm payment with Stripe'}
          </Button>
          {note ? <p className="mt-2 text-sm">{note}</p> : null}
        </div>
      ) : null}

      <div className="mt-8 space-y-6">
        {order.vendorOrders.map((vo) => (
          <section key={vo.id} className="border-b border-border pb-6">
            <Link href={`/shops/${vo.vendor.slug}`} className="font-display text-xl hover:text-accent">
              {vo.vendor.displayName}
            </Link>
            <p className="text-sm text-muted">{formatBuyerVendorSliceStatus(vo.status)}</p>
            {vo.status === 'fulfilling' && vo.fulfillingAt ? (
              <p className="mt-1 text-sm text-subtle">
                Started {new Date(vo.fulfillingAt).toLocaleString()}
              </p>
            ) : null}
            {vo.status === 'shipped' && (vo.trackingNumber || vo.shippedAt) ? (
              <p className="mt-1 text-sm text-muted">
                {vo.shippedAt ? `Shipped ${new Date(vo.shippedAt).toLocaleString()}` : 'Shipped'}
                {vo.trackingNumber
                  ? ` · ${vo.carrier ? `${vo.carrier} ` : ''}${vo.trackingNumber}`
                  : null}
              </p>
            ) : null}
            <ul className="mt-3 space-y-1 text-sm">
              {vo.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>
                    {item.quantity}× {item.title}
                  </span>
                  <Price cents={item.lineTotalCents} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Page>
  );
}
