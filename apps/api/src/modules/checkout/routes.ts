import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { checkoutSessionSchema } from '@crafthub/shared';
import { AppError } from '../../lib/errors.js';
import {
  createOrderFromCart,
  orderInclude,
  serializeOrder,
} from '../../lib/orders.js';
import { getStripe } from '../../lib/stripe.js';
import { env } from '../../env.js';
import { requireAuth, type AuthedRequest } from '../../middleware/auth.js';
import { enqueueReservationExpiry } from '../../lib/queue.js';
import { checkRateLimit, clientIp } from '../../lib/rate-limit.js';

export const checkoutRouter = Router();

checkoutRouter.use(requireAuth);

/**
 * POST /checkout/session
 * Auth-required: builds order + reservations, creates Stripe Checkout Session.
 */
checkoutRouter.post('/session', async (req: AuthedRequest, res, next) => {
  try {
    const limit = checkRateLimit(
      `checkout:${req.user!.sub}:${clientIp(req)}`,
      env.CHECKOUT_RATE_LIMIT_PER_MIN,
    );
    if (!limit.ok) {
      throw new AppError(
        429,
        'RATE_LIMITED',
        `Too many checkout attempts. Retry in ${limit.retryAfterSec}s`,
      );
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.sub } });
    if (user.status === 'banned') {
      throw new AppError(403, 'BANNED', 'This account has been banned');
    }

    const input = checkoutSessionSchema.parse(req.body);
    const idempotencyKey =
      typeof req.headers['idempotency-key'] === 'string'
        ? req.headers['idempotency-key']
        : null;

    // Reuse existing open payment session for same idempotency key.
    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey },
        include: { ...orderInclude, payment: true },
      });
      if (existing?.payment?.checkoutSessionId && existing.status === 'pending_payment') {
        const checkoutUrl = `${env.APP_URL}/checkout/success?orderId=${existing.id}&session_id=${existing.payment.checkoutSessionId}`;
        res.json({
          data: {
            orderId: existing.id,
            checkoutSessionId: existing.payment.checkoutSessionId,
            checkoutUrl,
            order: serializeOrder(existing),
            reused: true,
          },
        });
        return;
      }
    }

    const order = await createOrderFromCart({
      buyerId: user.id,
      shipping: input.shipping,
      idempotencyKey,
      saveAddress: input.saveAddress,
    });

    const stripe = getStripe();
    const lineItems = [
      {
        name: `CraftHub order ${order.id.slice(0, 8)}`,
        amountCents: order.totalCents,
        quantity: 1,
      },
    ];

    const session = await stripe.createCheckoutSession({
      orderId: order.id,
      amountCents: order.totalCents,
      currency: order.currency,
      customerEmail: user.email,
      successUrl: `${env.APP_URL}/checkout/success?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${env.APP_URL}/cart?checkout=cancelled`,
      lineItems,
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        status: 'pending',
        amountCents: order.totalCents,
        applicationFeeCents: order.commissionTotalCents,
        currency: order.currency,
        checkoutSessionId: session.id,
        paymentIntentId: session.payment_intent,
      },
    });

    await enqueueReservationExpiry(order.id, env.RESERVATION_TTL_MINUTES);

    const refreshed = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: orderInclude,
    });

    res.status(201).json({
      data: {
        orderId: order.id,
        checkoutSessionId: session.id,
        checkoutUrl: session.url,
        order: serializeOrder(refreshed),
        reused: false,
      },
    });
  } catch (err) {
    next(err);
  }
});
