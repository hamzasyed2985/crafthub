import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getStripe, isStripeMockMode } from '../../lib/stripe.js';
import { processStripeEvent } from '../../lib/payments.js';
import { AppError } from '../../lib/errors.js';
import { env } from '../../env.js';
import type Stripe from 'stripe';

export const stripeWebhookRouter = Router();

/**
 * POST /webhooks/stripe
 * Requires express.raw body on this path.
 */
stripeWebhookRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stripe = getStripe();
    const signature = req.headers['stripe-signature'];
    const raw = req.body as Buffer;
    if (!Buffer.isBuffer(raw)) {
      throw new AppError(400, 'INVALID_WEBHOOK', 'Expected raw body');
    }

    const event = stripe.constructWebhookEvent(
      raw,
      typeof signature === 'string' ? signature : undefined,
    );

    const result = await processStripeEvent(event);
    res.json({ received: true, processed: result.processed });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /webhooks/stripe/test — mock/dev only: inject a Stripe-like event JSON body.
 * Used by e2e when E2E_STRIPE_MOCK / no secret key.
 */
stripeWebhookRouter.post('/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isStripeMockMode() && env.NODE_ENV === 'production') {
      throw new AppError(404, 'NOT_FOUND', 'Not found');
    }
    if (!isStripeMockMode()) {
      throw new AppError(403, 'FORBIDDEN', 'Test webhook only available in Stripe mock mode');
    }

    const event = (
      Buffer.isBuffer(req.body)
        ? JSON.parse(req.body.toString('utf8'))
        : req.body
    ) as Stripe.Event;
    if (!event?.id || !event?.type) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Body must include id and type');
    }

    const result = await processStripeEvent(event);
    res.json({ received: true, processed: result.processed });
  } catch (err) {
    next(err);
  }
});
