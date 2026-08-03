import * as Sentry from '@sentry/node';
import { env } from '../env.js';
import { logger } from './logger.js';

let initialized = false;

/** Init once when SENTRY_DSN is set. Safe no-op otherwise. */
export function initSentry() {
  if (initialized) return;
  initialized = true;
  if (!env.SENTRY_DSN) {
    return;
  }
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
  logger.info('Sentry initialized');
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!env.SENTRY_DSN) return;
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(err);
  });
}
