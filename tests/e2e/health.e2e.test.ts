/**
 * PURPOSE: Prove the API process is alive and can reach Postgres.
 * Covers Phase 0 foundation health endpoints used by Docker/CI/deploy probes.
 */
import { describe, expect, it } from 'vitest';
import { api } from './helpers/api';

describe('e2e · health', () => {
  // Liveness: process is up (no DB required by design).
  it('GET /health returns ok', async () => {
    const { status, body } = await api<{ status: string }>('/health');
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
  });

  // Readiness: Postgres is reachable via Prisma.
  it('GET /ready returns ready when database is up', async () => {
    const { status, body } = await api<{ status: string }>('/ready');
    expect(status).toBe(200);
    expect(body.status).toBe('ready');
  });
});
