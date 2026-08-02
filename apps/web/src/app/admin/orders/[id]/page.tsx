'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Price } from '@crafthub/ui';
import { fetchAdminOrder, refundAdminOrder } from '@/lib/api';

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Awaited<ReturnType<typeof fetchAdminOrder>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('Customer requested refund');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminOrder(params.id)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, [params.id]);

  async function onRefund(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      const result = await refundAdminOrder(params.id, reason);
      setNote(
        result.result.alreadyRefunded
          ? 'Already refunded'
          : `Refunded. Debt vendors: ${(result.result.debtVendorIds ?? []).length}`,
      );
      setOrder(await fetchAdminOrder(params.id));
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Refund failed');
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  if (!order) return <p className="px-6 py-12 text-subtle">Loading…</p>;

  const canRefund =
    order.status === 'paid' || order.status === 'processing' || order.status === 'completed';

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin/orders" className="text-sm text-accent">
        ← Orders
      </Link>
      <h1 className="mt-4 font-display text-3xl">Order</h1>
      <p className="mt-2 text-muted">
        {order.status} · <Price cents={order.totalCents} /> · {order.buyer.email}
      </p>
      <p className="mt-1 text-sm text-subtle">
        Ship to {order.shipping.name}, {order.shipping.line1}, {order.shipping.city}{' '}
        {order.shipping.postalCode}
      </p>

      <div className="mt-8 space-y-6">
        {order.vendorOrders.map((vo) => (
          <section key={vo.id} className="border-b border-border pb-6">
            <p className="font-display text-xl">{vo.vendor.displayName}</p>
            <p className="text-sm text-muted">
              Slice {vo.status} · net <Price cents={vo.vendorNetCents} /> · commission{' '}
              <Price cents={vo.commissionCents} />
            </p>
            <p className="text-sm text-subtle">
              Transfer {vo.transfer?.status ?? 'none'}
              {vo.transfer ? (
                <>
                  {' '}
                  (<Price cents={vo.transfer.amountCents} />)
                </>
              ) : null}
              {' · '}
              vendor debt <Price cents={vo.outstandingDebtCents} />
              {vo.vendor.ledgerReviewRequired ? ' · needs ledger review' : null}
            </p>
            <ul className="mt-2 text-sm">
              {vo.items.map((item) => (
                <li key={item.id}>
                  {item.quantity}× {item.title}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {canRefund ? (
        <form onSubmit={(e) => void onRefund(e)} className="mt-8 space-y-3 border-t border-border pt-8">
          <h2 className="font-display text-xl">Refund</h2>
          <p className="text-sm text-muted">
            Full refund via Stripe. If payouts already left the platform, vendor debt is recorded and
            netted against future transfers.
          </p>
          <textarea
            className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? 'Refunding…' : 'Refund order'}
          </Button>
          {note ? <p className="text-sm">{note}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
