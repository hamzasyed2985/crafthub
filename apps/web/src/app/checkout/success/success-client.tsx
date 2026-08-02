'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Price } from '@crafthub/ui';
import {
  confirmOrderPayment,
  fetchOrder,
  readAccessToken,
  simulateCheckoutPaid,
  type OrderDto,
} from '@/lib/api';

export default function CheckoutSuccessPage() {
  const params = useSearchParams();
  const orderId = params.get('orderId');
  const mockSession = params.get('mock_session') ?? params.get('session_id');
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('Confirming payment…');

  useEffect(() => {
    if (!orderId) {
      setError('Missing order id');
      return;
    }
    if (!readAccessToken()) {
      setError('Please log in to view this order');
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let confirmed = false;

    async function tick() {
      try {
        if (mockSession?.startsWith('cs_mock_') && attempts === 0) {
          setMessage('Finalizing mock payment…');
          await simulateCheckoutPaid(orderId!, mockSession);
        }

        // Real Stripe: verify session with Stripe via API (covers missing local webhooks).
        if (!confirmed && mockSession && !mockSession.startsWith('cs_mock_')) {
          setMessage('Confirming payment with Stripe…');
          try {
            const result = await confirmOrderPayment(orderId!);
            confirmed = true;
            if (cancelled) return;
            setOrder(result.order);
            if (
              result.order.status === 'paid' ||
              result.order.status === 'processing' ||
              result.order.status === 'completed'
            ) {
              setMessage('Payment confirmed.');
              return;
            }
          } catch {
            // Fall through to poll — webhook may still arrive
          }
        }

        // Also try confirm once even without session_id in URL (order detail refresh).
        if (!confirmed && attempts === 2) {
          try {
            const result = await confirmOrderPayment(orderId!);
            confirmed = true;
            if (cancelled) return;
            setOrder(result.order);
            if (result.order.status === 'paid') {
              setMessage('Payment confirmed.');
              return;
            }
          } catch {
            // ignore
          }
        }

        const o = await fetchOrder(orderId!);
        if (cancelled) return;
        setOrder(o);
        if (o.status === 'paid' || o.status === 'processing' || o.status === 'completed') {
          setMessage('Payment confirmed.');
          return;
        }
        if (o.status === 'cancelled' || o.status === 'refunded') {
          setMessage(`Order ${o.status}.`);
          return;
        }
        attempts += 1;
        if (attempts < 20) {
          setMessage('Waiting for payment confirmation…');
          setTimeout(() => void tick(), 1500);
        } else {
          setMessage(
            'Still pending. Open this order again or ensure Stripe webhooks are forwarded.',
          );
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load order');
      }
    }

    void tick();
    return () => {
      cancelled = true;
    };
  }, [orderId, mockSession]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <h1 className="font-display text-3xl">Checkout</h1>
        <p className="mt-3 text-danger">{error}</p>
        <Link href="/cart" className="mt-4 inline-block text-accent">
          Back to cart
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-display text-3xl">Thank you</h1>
      <p className="mt-3 text-muted">{message}</p>
      {order ? (
        <div className="mt-8 space-y-3 rounded-md border border-border bg-elevated p-4">
          <p className="text-sm text-subtle">Order {order.id.slice(0, 8)}…</p>
          <p>
            Status: <strong>{order.status}</strong>
          </p>
          <p>
            Total: <Price cents={order.totalCents} />
          </p>
          <ul className="text-sm text-muted">
            {order.vendorOrders.map((vo) => (
              <li key={vo.id}>
                {vo.vendor.displayName}: {vo.status} · <Price cents={vo.vendorNetCents} /> to maker
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-8 flex gap-3">
        <Link href={orderId ? `/account/orders/${orderId}` : '/account/orders'}>
          <Button>View order</Button>
        </Link>
        {orderId && order?.status === 'pending_payment' ? (
          <Button
            variant="secondary"
            onClick={() => {
              void confirmOrderPayment(orderId)
                .then((r) => {
                  setOrder(r.order);
                  setMessage(
                    r.order.status === 'paid'
                      ? 'Payment confirmed.'
                      : `Status: ${r.order.status}`,
                  );
                })
                .catch((err) =>
                  setMessage(err instanceof Error ? err.message : 'Confirm failed'),
                );
            }}
          >
            Confirm payment
          </Button>
        ) : null}
        <Link href="/explore">
          <Button variant="secondary">Keep browsing</Button>
        </Link>
      </div>
    </div>
  );
}
