/**
 * PURPOSE: Smoke-check that the e2e runner can reach the configured API base URL
 * before deeper suites run. Fails fast with a clear message if `pnpm dev:api` is down.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { API_URL, api } from './helpers/api';

describe('e2e · prerequisites', () => {
  beforeAll(async () => {
    try {
      const { status } = await api('/health');
      if (status !== 200) {
        throw new Error(`Health returned ${status}`);
      }
    } catch (err) {
      throw new Error(
        `CraftHub API is not reachable at ${API_URL}. Start Docker + \`pnpm db:seed\` + \`pnpm dev:api\` first. (${String(err)})`,
      );
    }
  });

  it('API base URL is reachable', async () => {
    const { status, body } = await api<{ status: string }>('/health');
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
  });
});
