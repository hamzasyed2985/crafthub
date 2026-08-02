'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Price } from '@crafthub/ui';
import {
  fetchVendorOrder,
  fulfillVendorOrder,
  shipVendorOrder,
  type VendorOrderDto,
} from '@/lib/api';

export default function VendorOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<VendorOrderDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');

  useEffect(() => {
    fetchVendorOrder(params.id)
      .then((vo) => {
        setOrder(vo);
        setTrackingNumber(vo.trackingNumber ?? '');
        setCarrier(vo.carrier ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, [params.id]);

  async function onFulfill() {
    setBusy(true);
    setNote(null);
    try {
      const vo = await fulfillVendorOrder(params.id);
      setOrder(vo);
      setNote('Marked as fulfilling.');
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Fulfill failed');
    } finally {
      setBusy(false);
    }
  }

  async function onShip(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      const vo = await shipVendorOrder(params.id, {
        trackingNumber: trackingNumber.trim() || undefined,
        carrier: carrier.trim() || undefined,
      });
      setOrder(vo);
      setNote('Marked as shipped.');
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Ship failed');
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-danger">{error}</p>
        <Link href="/vendor/orders" className="text-accent">
          ← Orders
        </Link>
      </div>
    );
  }

  if (!order) return <p className="px-6 py-12 text-subtle">Loading…</p>;

  const canFulfill = order.status === 'paid';
  const canShip = order.status === 'paid' || order.status === 'fulfilling';

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/vendor/orders" className="text-sm text-accent">
        ← Orders
      </Link>
      <h1 className="mt-4 font-display text-3xl">Order slice</h1>
      <p className="mt-2 text-muted">
        Status <strong>{order.status}</strong> · Net <Price cents={order.vendorNetCents} />
      </p>

      <section className="mt-8">
        <h2 className="font-display text-xl">Ship to</h2>
        <p className="mt-2 text-sm text-muted">
          {order.order.shipName}
          <br />
          {order.order.shipLine1}
          {order.order.shipLine2 ? (
            <>
              <br />
              {order.order.shipLine2}
            </>
          ) : null}
          <br />
          {order.order.shipCity}
          {order.order.shipRegion ? `, ${order.order.shipRegion}` : ''}{' '}
          {order.order.shipPostalCode}
          <br />
          {order.order.shipCountry}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl">Items</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.quantity}× {item.title}
              </span>
              <Price cents={item.lineTotalCents} />
            </li>
          ))}
        </ul>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-muted">
          <dt>Items</dt>
          <dd className="text-right">
            <Price cents={order.itemsSubtotalCents} />
          </dd>
          <dt>Shipping</dt>
          <dd className="text-right">
            <Price cents={order.shippingCents} />
          </dd>
          <dt>Commission</dt>
          <dd className="text-right">
            <Price cents={order.commissionCents} />
          </dd>
          <dt>Your net</dt>
          <dd className="text-right font-semibold text-ink">
            <Price cents={order.vendorNetCents} />
          </dd>
        </dl>
      </section>

      {canFulfill || canShip ? (
        <section className="mt-10 space-y-4 border-t border-border pt-8">
          <h2 className="font-display text-xl">Fulfillment</h2>
          {canFulfill ? (
            <Button size="sm" disabled={busy} onClick={() => void onFulfill()}>
              Start fulfilling
            </Button>
          ) : null}
          {canShip ? (
            <form onSubmit={(e) => void onShip(e)} className="space-y-3">
              <div>
                <label className="block text-sm text-subtle" htmlFor="tracking">
                  Tracking number (optional)
                </label>
                <input
                  id="tracking"
                  className="mt-1 w-full rounded-md border border-border bg-canvas px-3 py-2"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-subtle" htmlFor="carrier">
                  Carrier (optional)
                </label>
                <input
                  id="carrier"
                  className="mt-1 w-full rounded-md border border-border bg-canvas px-3 py-2"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                />
              </div>
              <Button type="submit" size="sm" disabled={busy}>
                Mark shipped
              </Button>
            </form>
          ) : null}
          {note ? <p className="text-sm">{note}</p> : null}
        </section>
      ) : (
        <section className="mt-10 border-t border-border pt-8 text-sm text-muted">
          {order.shippedAt ? (
            <p>
              Shipped {new Date(order.shippedAt).toLocaleString()}
              {order.trackingNumber
                ? ` · ${order.carrier ? `${order.carrier} ` : ''}${order.trackingNumber}`
                : null}
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}
