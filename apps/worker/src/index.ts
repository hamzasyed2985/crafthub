import { config } from 'dotenv';
import { resolve } from 'node:path';
import { Worker, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import pino from 'pino';
import { prisma } from '@crafthub/db';

config({ path: resolve(process.cwd(), '../../.env') });
config();

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const RESERVATION_QUEUE = 'reservations';

async function cancelPendingOrder(orderId: string, reason: string) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== 'pending_payment') return;

    await tx.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
    });
    await tx.vendorOrder.updateMany({
      where: { orderId },
      data: { status: 'cancelled' },
    });
    await tx.payment.updateMany({
      where: { orderId, status: 'pending' },
      data: { status: 'cancelled' },
    });
    await tx.inventoryReservation.deleteMany({ where: { orderId } });
    await tx.auditLog.create({
      data: {
        action: 'order.cancelled',
        entity: 'order',
        entityId: orderId,
        meta: { reason },
      },
    });
  });
}

async function expireReservations() {
  const expired = await prisma.inventoryReservation.findMany({
    where: { expiresAt: { lte: new Date() } },
    select: { orderId: true },
    distinct: ['orderId'],
  });

  for (const row of expired) {
    await cancelPendingOrder(row.orderId, 'reservation_expired');
  }
  return expired.length;
}

async function main() {
  const connection = { url: redisUrl };

  const worker = new Worker(
    RESERVATION_QUEUE,
    async (job) => {
      if (job.name === 'expire-order') {
        const orderId = job.data.orderId as string;
        await cancelPendingOrder(orderId, 'reservation_ttl');
        logger.info({ orderId }, 'Expired order reservations via delayed job');
        return;
      }
      if (job.name === 'sweep') {
        const count = await expireReservations();
        logger.debug({ count }, 'Reservation sweep complete');
      }
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'Reservation job failed');
  });

  const queue = new Queue(RESERVATION_QUEUE, { connection });
  await queue.add(
    'sweep',
    {},
    {
      repeat: { every: 60_000 },
      jobId: 'reservation-sweep',
    },
  );

  // Connectivity check
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
  try {
    await redis.connect();
    await redis.ping();
    logger.info({ redisUrl }, 'CraftHub worker ready (reservation expiry + sweep)');
  } catch (err) {
    logger.warn({ err }, 'Redis not reachable — worker may idle until Redis is up');
  } finally {
    redis.disconnect();
  }
}

main().catch((err) => {
  logger.error({ err }, 'Worker failed to start');
  process.exit(1);
});
