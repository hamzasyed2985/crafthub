/**
 * DB helpers for e2e setup that has no public API yet (e.g. ban user).
 * Prefer HTTP for everything else.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from '@crafthub/db';

function loadRootEnv() {
  if (process.env.DATABASE_URL) return;
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadRootEnv();

/** Mark a user banned so login returns BANNED (no admin ban API yet). */
export async function banUserByEmail(email: string) {
  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { status: 'banned' },
  });
}

export { prisma };
