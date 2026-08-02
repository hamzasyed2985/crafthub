/**
 * PURPOSE: Phase 6.5 AI — embeddings retrieval, concierge product IDs, listing draft.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { prisma } from './helpers/db';
import { expectOk, login, SEED } from './helpers/api';

describe('e2e · AI features (phase 6.5)', () => {
  let adminToken: string;
  let potteryToken: string;

  beforeAll(async () => {
    const admin = await login(SEED.admin.email, SEED.admin.password);
    adminToken = admin.data.accessToken;
    const pottery = await login(SEED.pottery.email, SEED.pottery.password);
    potteryToken = pottery.data.accessToken;

    await expectOk('/api/v1/ai/embeddings/reindex?sync=1', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({}),
    });
  });

  it('indexes active product embeddings', async () => {
    const status = await expectOk<{
      data: { activeProducts: number; embeddings: number; mock: boolean };
    }>('/api/v1/ai/embeddings/status', { token: adminToken });

    expect(status.data.activeProducts).toBeGreaterThan(0);
    expect(status.data.embeddings).toBeGreaterThan(0);
    expect(status.data.mock).toBe(true);

    const count = await prisma.productEmbedding.count();
    expect(count).toBe(status.data.embeddings);
  });

  it('concierge returns real catalog product IDs', async () => {
    const res = await expectOk<{
      data: {
        reply: string;
        productIds: string[];
        products: Array<{ id: string; title: string; priceCents: number | null }>;
        meta: { retrieved: number; mock: boolean; basedOnCatalog: boolean };
      };
    }>('/api/v1/ai/concierge', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'handmade ceramic mug under 40 dollars' }],
        limit: 6,
      }),
    });

    expect(res.data.meta.basedOnCatalog).toBe(true);
    expect(res.data.meta.mock).toBe(true);
    expect(res.data.productIds.length).toBeGreaterThan(0);
    expect(res.data.products.length).toBe(res.data.productIds.length);
    expect(res.data.reply.length).toBeGreaterThan(10);

    for (const id of res.data.productIds) {
      const product = await prisma.product.findUnique({ where: { id } });
      expect(product).toBeTruthy();
      expect(product!.status).toBe('active');
    }

    // Prices must come from DB-shaped fields on products payload (may be null only if no variant)
    expect(res.data.products.some((p) => typeof p.priceCents === 'number')).toBe(true);
  });

  it('listing copilot fills draft fields for approved vendor', async () => {
    const res = await expectOk<{
      data: {
        draft: {
          title: string;
          description: string;
          tags: string[];
          categoryId: string | null;
          materialCare: string;
        };
        meta: { mock: boolean };
      };
    }>('/api/v1/ai/listings/generate', {
      method: 'POST',
      token: potteryToken,
      body: JSON.stringify({
        notes:
          'Hand-thrown speckled stoneware mug, 10oz, matte clay glaze, ships from Islamabad studio.',
        categoryHint: 'Pottery',
      }),
    });

    expect(res.data.meta.mock).toBe(true);
    expect(res.data.draft.title.length).toBeGreaterThan(3);
    expect(res.data.draft.description.length).toBeGreaterThan(10);

    const logged = await prisma.aiGeneration.findFirst({
      where: { kind: 'listing_draft', userId: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    expect(logged).toBeTruthy();
  });
});
