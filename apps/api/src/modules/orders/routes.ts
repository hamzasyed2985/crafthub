import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { AppError } from '../../lib/errors.js';
import { parsePagination, routeParam } from '../../lib/helpers.js';
import { orderInclude, serializeOrder } from '../../lib/orders.js';
import { markOrderPaid } from '../../lib/payments.js';
import { getStripe } from '../../lib/stripe.js';
import { requireAuth, type AuthedRequest } from '../../middleware/auth.js';

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = { buyerId: req.user!.sub };
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      data: orders.map(serializeOrder),
      meta: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /orders/:id/confirm-payment
 * Backup when webhooks cannot reach localhost: ask Stripe if the Checkout
 * Session is paid, then finalize the order. Never trusts the browser alone.
 */
ordersRouter.post('/:id/confirm-payment', async (req: AuthedRequest, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const order = await prisma.order.findFirst({
      where: { id, buyerId: req.user!.sub },
      include: orderInclude,
    });
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');

    if (order.status === 'paid' || order.status === 'processing' || order.status === 'completed') {
      res.json({ data: { order: serializeOrder(order), alreadyPaid: true } });
      return;
    }

    if (order.status !== 'pending_payment') {
      throw new AppError(400, 'NOT_CONFIRMABLE', `Order status is ${order.status}`);
    }

    const sessionId = order.payment?.checkoutSessionId;
    if (!sessionId) {
      throw new AppError(400, 'NO_SESSION', 'No Stripe checkout session on this order');
    }

    const stripe = getStripe();
    const session = await stripe.retrieveCheckoutSession(sessionId);
    if (session.payment_status !== 'paid') {
      throw new AppError(
        402,
        'PAYMENT_INCOMPLETE',
        `Stripe session status is ${session.payment_status ?? 'unknown'}`,
      );
    }

    await markOrderPaid({
      orderId: order.id,
      paymentIntentId: session.payment_intent,
      checkoutSessionId: session.id,
    });

    const refreshed = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: orderInclude,
    });

    res.json({ data: { order: serializeOrder(refreshed), alreadyPaid: false } });
  } catch (err) {
    next(err);
  }
});

ordersRouter.get('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const order = await prisma.order.findFirst({
      where: { id, buyerId: req.user!.sub },
      include: orderInclude,
    });
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
    res.json({ data: { order: serializeOrder(order) } });
  } catch (err) {
    next(err);
  }
});
