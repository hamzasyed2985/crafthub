const hits = new Map<string, { count: number; resetAt: number }>();

/** Simple in-memory fixed-window rate limit (per process). */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const row = hits.get(key);
  if (!row || now >= row.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (row.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((row.resetAt - now) / 1000) };
  }
  row.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(req: { headers: Record<string, unknown>; socket?: { remoteAddress?: string } }): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) {
    return xf.split(',')[0]?.trim() || 'unknown';
  }
  if (Array.isArray(xf) && typeof xf[0] === 'string') {
    return xf[0].split(',')[0]?.trim() || 'unknown';
  }
  return req.socket?.remoteAddress || 'unknown';
}
