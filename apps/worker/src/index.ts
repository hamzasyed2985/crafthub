import { config } from 'dotenv';
import { resolve } from 'node:path';
import { Redis } from 'ioredis';
import pino from 'pino';

config({ path: resolve(process.cwd(), '../../.env') });
config();

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

async function main() {
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    const pong = await redis.ping();
    logger.info({ pong, redisUrl }, 'CraftHub worker ready (Phase 0 stub — BullMQ jobs land in Phase 3+)');
  } catch (err) {
    logger.warn({ err }, 'Redis not reachable yet — worker stub idle');
  }

  // Keep process alive for compose; real consumers come later.
  setInterval(() => {
    logger.debug('worker heartbeat');
  }, 60_000);
}

main().catch((err) => {
  logger.error({ err }, 'Worker failed to start');
  process.exit(1);
});
