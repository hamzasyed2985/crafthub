import { prisma } from '@crafthub/db';
import type Stripe from 'stripe';
import { cancelPendingOrder, releaseOrderReservations } from './orders.js';
import { payoutVendorOrder, refundOrder } from './refunds.js';
import { enqueueEmail } from './email.js';
import { logger } from './logger.js';

/**
 * Mark payment succeeded: stock decrement, clear cart, transfers to vendors.
 * Idempotent when called after payment_events insert.
 */
export async function markOrderPaid(opts: {
  orderId: string;
  paymentIntentId?: string | null;
  checkoutSessionId?: string | null;
}) {
  const order = await prisma.order.findUnique({
    where: { id: opts.orderId },
    include: {
      reservations: true,
      vendorOrders: {
        include: {
          vendor: { include: { stripeAccount: true } },
        },
      },
      payment: true,
      buyer: true,
    },
  });

  if (!order) {
    logger.warn({ orderId: opts.orderId }, 'markOrderPaid: order not found');
    return;
  }

  if (order.status === 'paid' || order.status === 'processing' || order.status === 'completed') {
    return;
  }

  if (order.status !== 'pending_payment') {
    logger.warn({ orderId: order.id, status: order.status }, 'markOrderPaid: unexpected status');
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const reservation of order.reservations) {
      await tx.productVariant.update({
        where: { id: reservation.variantId },
        data: { stockQty: { decrement: reservation.quantity } },
      });
    }

    await tx.inventoryReservation.deleteMany({ where: { orderId: order.id } });

    await tx.order.update({
      where: { id: order.id },
      data: { status: 'paid' },
    });

    await tx.vendorOrder.updateMany({
      where: { orderId: order.id },
      data: { status: 'paid' },
    });

    if (order.payment) {
      await tx.payment.update({
        where: { id: order.payment.id },
        data: {
          status: 'succeeded',
          paymentIntentId: opts.paymentIntentId ?? order.payment.paymentIntentId,
          checkoutSessionId: opts.checkoutSessionId ?? order.payment.checkoutSessionId,
        },
      });
    }

    const cart = await tx.cart.findUnique({ where: { userId: order.buyerId } });
    if (cart) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  });

  const refreshed = await prisma.vendorOrder.findMany({
    where: { orderId: order.id },
    include: { vendor: { include: { stripeAccount: true } }, transfer: true },
  });

  for (const vo of refreshed) {
    if (vo.transfer) continue;
    await payoutVendorOrder({
      vendorOrderId: vo.id,
      orderId: order.id,
      vendorId: vo.vendorId,
      vendorNetCents: vo.vendorNetCents,
      currency: order.currency,
      destination: vo.vendor.stripeAccount?.stripeAccountId,
    });
  }

  try {
    await enqueueEmail({
      toEmail: order.buyer.email,
      template: 'order.paid',
      payload: {
        orderId: order.id,
        name: order.buyer.name,
        totalLabel: `$${(order.totalCents / 100).toFixed(2)} ${order.currency}`,
      },
    });
  } catch (err) {
    logger.warn({ err, orderId: order.id }, 'Failed to enqueue order.paid email');
  }
}

async function syncStripeAccountFromEvent(account: Stripe.Account) {
  const row = await prisma.stripeAccount.findFirst({
    where: { stripeAccountId: account.id },
  });
  if (!row) return;

  await prisma.stripeAccount.update({
    where: { id: row.id },
    data: {
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled),
      onboardingComplete: Boolean(account.details_submitted),
    },
  });
}

function orderIdFromSession(session: Stripe.Checkout.Session): string | null {
  return (
    session.metadata?.orderId ??
    session.client_reference_id ??
    null
  );
}

function orderIdFromPaymentIntent(pi: Stripe.PaymentIntent): string | null {
  return pi.metadata?.orderId ?? null;
}

async function syncRefundFromStripe(paymentIntentId: string | null | undefined) {
  if (!paymentIntentId) return;
  const payment = await prisma.payment.findFirst({
    where: { paymentIntentId },
  });
  if (!payment) return;
  await refundOrder({
    orderId: payment.orderId,
    actorId: null,
    reason: 'Synced from Stripe refund webhook',
    skipStripe: true,
  });
}

/**
 * Process a verified Stripe event. Inserts payment_events first for idempotency.
 * Returns whether the event was newly processed.
 */
export async function processStripeEvent(event: Stripe.Event): Promise<{ processed: boolean }> {
  try {
    await prisma.paymentEvent.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
        payload: event as unknown as object,
      },
    });
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      return { processed: false };
    }
    throw err;
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = orderIdFromSession(session);
      if (orderId && session.payment_status === 'paid') {
        const pi =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;
        await markOrderPaid({
          orderId,
          paymentIntentId: pi,
          checkoutSessionId: session.id,
        });
      }
      break;
    }
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = orderIdFromPaymentIntent(pi);
      if (orderId) {
        await markOrderPaid({ orderId, paymentIntentId: pi.id });
      } else {
        const payment = await prisma.payment.findFirst({
          where: { paymentIntentId: pi.id },
        });
        if (payment) {
          await markOrderPaid({ orderId: payment.orderId, paymentIntentId: pi.id });
        }
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const payment = await prisma.payment.findFirst({
        where: { paymentIntentId: pi.id },
      });
      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'failed' },
        });
        await cancelPendingOrder(payment.orderId, 'payment_failed');
      }
      break;
    }
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = orderIdFromSession(session);
      if (orderId) {
        await cancelPendingOrder(orderId, 'checkout_session_expired');
      }
      break;
    }
    case 'account.updated': {
      await syncStripeAccountFromEvent(event.data.object as Stripe.Account);
      break;
    }
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const pi =
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id ?? null;
      await syncRefundFromStripe(pi);
      break;
    }
    case 'refund.created': {
      const refund = event.data.object as Stripe.Refund;
      const pi =
        typeof refund.payment_intent === 'string'
          ? refund.payment_intent
          : refund.payment_intent?.id ?? null;
      await syncRefundFromStripe(pi);
      break;
    }
    default: {
      const _exhaustive: string = event.type;
      void _exhaustive;
      break;
    }
  }

  void releaseOrderReservations;
  return { processed: true };
}
