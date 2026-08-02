import { Queue } from 'bullmq';
import { env } from '../env.js';
import { logger } from './logger.js';

export const RESERVATION_QUEUE = 'reservations';
export const EMAIL_QUEUE = 'emails';

let queue: Queue | null = null;
let emailQueue: Queue | null = null;

function getQueue() {
  if (queue) return queue;
  queue = new Queue(RESERVATION_QUEUE, {
    connection: { url: env.REDIS_URL },
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 200,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  });
  return queue;
}

function getEmailQueue() {
  if (emailQueue) return emailQueue;
  emailQueue = new Queue(EMAIL_QUEUE, {
    connection: { url: env.REDIS_URL },
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 200,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  });
  return emailQueue;
}

/** Schedule a one-shot job to expire reservations for an order after TTL. */
export async function enqueueReservationExpiry(orderId: string, ttlMinutes: number) {
  try {
    const q = getQueue();
    await q.add(
      'expire-order',
      { orderId },
      {
        jobId: `expire-${orderId}`,
        delay: Math.max(1, ttlMinutes) * 60_000,
      },
    );
  } catch (err) {
    logger.warn({ err, orderId }, 'Failed to enqueue reservation expiry (Redis down?)');
  }
}

export async function enqueueEmailJob(emailId: string) {
  const q = getEmailQueue();
  await q.add('send', { emailId }, { jobId: `email-${emailId}` });
}
