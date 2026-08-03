import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

config({ path: resolve(process.cwd(), '../../.env') });
config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  APP_URL: z.string().default('http://localhost:3000'),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_PUBLISHABLE_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  E2E_STRIPE_MOCK: z.string().optional().default(''),
  RESERVATION_TTL_MINUTES: z.coerce.number().default(30),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
  GROQ_API_KEY: z.string().optional().default(''),
  GROQ_CHAT_MODEL: z.string().default('llama-3.1-8b-instant'),
  E2E_AI_MOCK: z.string().optional().default(''),
  AI_RATE_LIMIT_PER_MIN: z.coerce.number().default(30),
  AI_MAX_TOKENS: z.coerce.number().default(600),
  AUTH_RATE_LIMIT_PER_MIN: z.coerce.number().default(20),
  CHECKOUT_RATE_LIMIT_PER_MIN: z.coerce.number().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid API environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  useStripeMock:
    parsed.data.E2E_STRIPE_MOCK === '1' ||
    parsed.data.E2E_STRIPE_MOCK === 'true' ||
    !parsed.data.STRIPE_SECRET_KEY,
};
