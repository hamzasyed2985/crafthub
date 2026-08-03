import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { router } from './routes.js';
import { stripeWebhookRouter } from './modules/webhooks/stripe.js';
import { env } from './env.js';
import { AppError, errorHandler, sendError } from './lib/errors.js';
import { logger } from './lib/logger.js';
import { requestIdMiddleware, type RequestWithId } from './middleware/request-id.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Cart-Session',
      'Idempotency-Key',
      'Stripe-Signature',
      'X-Request-Id',
    ],
    exposedHeaders: ['X-Request-Id'],
  }),
);

app.use(requestIdMiddleware);

// Stripe webhooks need the raw body for signature verification.
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRouter);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(router);

app.use((req, res) => {
  sendError(res, 404, 'NOT_FOUND', 'Route not found', undefined, (req as RequestWithId).requestId);
});

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof ZodError) {
    sendError(
      res,
      400,
      'VALIDATION_ERROR',
      'Invalid request',
      err.flatten(),
      (req as RequestWithId).requestId,
    );
    return;
  }
  errorHandler(err, req, res, next);
});

app.listen(env.API_PORT, () => {
  logger.info(
    { stripeMock: env.useStripeMock },
    `CraftHub API listening on :${env.API_PORT}`,
  );
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});

export { AppError };
