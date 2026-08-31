'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Price } from '@crafthub/ui';
import { Page } from '@/components/page';
import { fetchAdminOrder, refundAdminOrder, retryAdminVendorTransfer } from '@/lib/api';
import { formatStatusLabel } from '@/lib/format-status';

type AdminOrderDetail = NonNullable<Awaited<ReturnType<typeof fetchAdminOrder>>>;
type AdminVendorSlice = AdminOrderDetail['vendorOrders'][number];

function canRetryTransfer(vo: AdminVendorSlice) {
  if (vo.transfer?.status === 'failed') return true;
  if (vo.transfer?.status === 'paid') return false;
  if (vo.transfer) return false;
  return (
    vo.status !== 'awaiting_payment' &&
    vo.status !== 'cancelled' &&
    vo.status !== 'refunded'
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Awaited<ReturnType<typeof fetchAdminOrder>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('Customer requested refund');
  const [busy, setBusy] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
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

  async function onRetryTransfer(vendorOrderId: string) {
    setRetryingId(vendorOrderId);
    setNote(null);
    try {
      const result = await retryAdminVendorTransfer(vendorOrderId);
      setNote(
        result.alreadyPaid
          ? 'Transfer already paid.'
          : result.transfer.status === 'paid'
            ? 'Transfer succeeded.'
            : `Transfer still ${formatStatusLabel(result.transfer.status)} — check vendor Stripe Connect onboarding.`,
      );
      setOrder(await fetchAdminOrder(params.id));
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setRetryingId(null);
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
        <p className="text-subtle">Loading…</p>
      </Page>
    );

  const canRefund =
    order.status === 'paid' || order.status === 'processing' || order.status === 'completed';

  return (
    <Page size="reading">
      <Link href="/admin/orders" className="text-sm text-accent">
        ← Orders
      </Link>
      <h1 className="mt-4 font-display text-3xl">Order</h1>
      <p className="mt-2 text-muted">
        {formatStatusLabel(order.status)} · <Price cents={order.totalCents} /> · {order.buyer.email}
      </p>
      {order.payment ? (
        <p className="mt-1 text-sm text-subtle">
          Customer payment: {formatStatusLabel(order.payment.status)}
        </p>
      ) : null}
      <p className="mt-1 text-sm text-subtle">
        Ship to {order.shipping.name}, {order.shipping.line1}, {order.shipping.city}{' '}
        {order.shipping.postalCode}
      </p>

      <div className="mt-8 space-y-6">
        {order.vendorOrders.map((vo) => (
          <section key={vo.id} className="border-b border-border pb-6">
            <p className="font-display text-xl">{vo.vendor.displayName}</p>
            <p className="text-sm text-muted">
              Slice {formatStatusLabel(vo.status)} · net <Price cents={vo.vendorNetCents} /> · commission{' '}
              <Price cents={vo.commissionCents} />
            </p>
            <p className="text-sm text-subtle">
              Vendor payout: {vo.transfer ? formatStatusLabel(vo.transfer.status) : 'not attempted'}
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
            {canRetryTransfer(vo) ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-3"
                disabled={retryingId === vo.id}
                onClick={() => void onRetryTransfer(vo.id)}
              >
                {retryingId === vo.id ? 'Retrying…' : 'Retry vendor payout'}
              </Button>
            ) : null}
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

      {note ? <p className="mt-6 text-sm">{note}</p> : null}

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
        </form>
      ) : null}
    </Page>
  );
}
