import { prisma } from '@crafthub/db';
import { AppError } from './errors.js';
import { applyDebtOffsetToPayout, recordRefundDebt } from './ledger.js';
import { getStripe } from './stripe.js';
import { logger } from './logger.js';

/**
 * Full-order refund: Stripe refund + local status + ledger debt when payout already sent.
 * Does not reverse Stripe transfers — debts net against future payouts.
 */
export async function refundOrder(opts: {
  orderId: string;
  actorId: string | null;
  reason: string;
  skipStripe?: boolean;
}) {
  const order = await prisma.order.findUnique({
    where: { id: opts.orderId },
    include: {
      payment: true,
      vendorOrders: { include: { transfer: true } },
    },
  });
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
  if (order.status === 'refunded') {
    return { orderId: order.id, alreadyRefunded: true as const };
  }
  if (order.status !== 'paid' && order.status !== 'processing' && order.status !== 'completed') {
    throw new AppError(400, 'NOT_REFUNDABLE', `Order status ${order.status} is not refundable`);
  }
  if (!order.payment || order.payment.status !== 'succeeded') {
    throw new AppError(400, 'NOT_REFUNDABLE', 'Payment has not succeeded');
  }

  const paymentIntentId = order.payment.paymentIntentId;
  if (!opts.skipStripe) {
    if (!paymentIntentId) {
      throw new AppError(400, 'NO_PAYMENT_INTENT', 'Missing payment intent for refund');
    }
    const stripe = getStripe();
    await stripe.createRefund({
      paymentIntentId,
      idempotencyKey: `refund-order-${order.id}`,
      reason: opts.reason,
    });
  }

  const debtVendorIds = new Set<string>();

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'refunded' },
    });
    await tx.payment.update({
      where: { id: order.payment!.id },
      data: { status: 'refunded' },
    });
    await tx.vendorOrder.updateMany({
      where: { orderId: order.id },
      data: { status: 'refunded' },
    });

    for (const vo of order.vendorOrders) {
      const paidOutCents =
        vo.transfer?.status === 'paid' ? (vo.transfer.amountCents ?? 0) : 0;
      if (paidOutCents > 0) {
        await recordRefundDebt(
          {
            vendorId: vo.vendorId,
            amountCents: paidOutCents,
            currency: order.currency,
            orderId: order.id,
            vendorOrderId: vo.id,
            note: opts.reason,
          },
          tx,
        );
        debtVendorIds.add(vo.vendorId);
      }
    }

    await tx.auditLog.create({
      data: {
        actorId: opts.actorId,
        action: 'order.refund',
        entity: 'order',
        entityId: order.id,
        meta: {
          reason: opts.reason,
          debtVendorIds: [...debtVendorIds],
          skipStripe: Boolean(opts.skipStripe),
        },
      },
    });
  });

  return {
    orderId: order.id,
    alreadyRefunded: false as const,
    debtVendorIds: [...debtVendorIds],
  };
}

/**
 * Apply Stripe payout for a vendor order, netting outstanding ledger debt first.
 */
export async function payoutVendorOrder(opts: {
  vendorOrderId: string;
  orderId: string;
  vendorId: string;
  vendorNetCents: number;
  currency: string;
  destination: string | null | undefined;
}) {
  const existing = await prisma.transfer.findUnique({
    where: { vendorOrderId: opts.vendorOrderId },
  });
  if (existing) return existing;

  if (!opts.destination || opts.vendorNetCents <= 0) {
    return prisma.transfer.create({
      data: {
        vendorOrderId: opts.vendorOrderId,
        amountCents: opts.vendorNetCents,
        currency: opts.currency,
        status: 'failed',
        stripeTransferId: null,
      },
    });
  }

  const { sendCents, offsetCents } = await applyDebtOffsetToPayout({
    vendorId: opts.vendorId,
    payoutCents: opts.vendorNetCents,
    currency: opts.currency,
    orderId: opts.orderId,
    vendorOrderId: opts.vendorOrderId,
  });

  if (sendCents <= 0) {
    logger.info(
      { vendorOrderId: opts.vendorOrderId, offsetCents },
      'Payout fully absorbed by vendor debt',
    );
    return prisma.transfer.create({
      data: {
        vendorOrderId: opts.vendorOrderId,
        amountCents: 0,
        currency: opts.currency,
        status: 'paid',
        stripeTransferId: null,
      },
    });
  }

  const stripe = getStripe();
  try {
    const transfer = await stripe.createTransfer({
      amountCents: sendCents,
      currency: opts.currency,
      destination: opts.destination,
      transferGroup: opts.orderId,
      idempotencyKey: `transfer-${opts.vendorOrderId}`,
    });
    return prisma.transfer.create({
      data: {
        vendorOrderId: opts.vendorOrderId,
        amountCents: sendCents,
        currency: opts.currency,
        status: 'paid',
        stripeTransferId: transfer.id,
      },
    });
  } catch (err) {
    logger.error({ err, vendorOrderId: opts.vendorOrderId }, 'Transfer failed');
    // Roll back the debt_offset we just wrote if Stripe failed — otherwise debt is
    // incorrectly reduced without a payout. Re-create by recording negative offset
    // is messy; instead delete the latest debt_offset for this vendorOrderId.
    await prisma.vendorLedgerEntry.deleteMany({
      where: {
        vendorOrderId: opts.vendorOrderId,
        kind: 'debt_offset',
      },
    });
    return prisma.transfer.create({
      data: {
        vendorOrderId: opts.vendorOrderId,
        amountCents: opts.vendorNetCents,
        currency: opts.currency,
        status: 'failed',
        stripeTransferId: null,
      },
    });
  }
}
