/**
 * PURPOSE: Cover Phase 1 public catalog — categories, shops, products, and PDPs.
 * Relies on seeded shops (clay-ember, grain-groove) from `pnpm db:seed`.
 */
import { describe, expect, it } from 'vitest';
import { api, expectOk, SEED } from './helpers/api';

describe('e2e · catalog (public)', () => {
  // Categories power explore filters and vendor product forms.
  it('lists craft categories', async () => {
    const body = await expectOk<{ data: Array<{ slug: string; name: string }> }>(
      '/api/v1/categories',
    );
    const slugs = body.data.map((c) => c.slug);
    expect(slugs).toContain('pottery');
    expect(slugs).toContain('woodwork');
  });

  // Approved shops must appear in the public makers directory.
  it('lists approved shops including seeded makers', async () => {
    const body = await expectOk<{
      data: Array<{ slug: string; displayName: string }>;
      meta: { total: number };
    }>('/api/v1/shops?limit=50');

    expect(body.meta.total).toBeGreaterThanOrEqual(2);
    expect(body.data.length).toBeGreaterThan(0);

    // Direct slug lookups (list pagination can bury seeds after many e2e shops).
    for (const slug of [SEED.pottery.shopSlug, SEED.wood.shopSlug]) {
      const detail = await expectOk<{ data: { shop: { slug: string } } }>(
        `/api/v1/shops/${slug}`,
      );
      expect(detail.data.shop.slug).toBe(slug);
    }
  });

  // Shop detail returns profile + only active products for that maker.
  it('returns shop detail with products for clay-ember', async () => {
    const body = await expectOk<{
      data: {
        shop: { slug: string; displayName: string };
        products: Array<{ slug: string; status: string; variants: unknown[] }>;
      };
    }>(`/api/v1/shops/${SEED.pottery.shopSlug}`);

    expect(body.data.shop.slug).toBe('clay-ember');
    expect(body.data.products.some((p) => p.slug === 'ember-mug')).toBe(true);
    expect(body.data.products.every((p) => p.variants.length >= 1)).toBe(true);
  });

  // Marketplace feed must only expose active products from approved vendors.
  it('lists marketplace products from multiple shops', async () => {
    const clay = await expectOk<{
      data: Array<{ shop: { vendor: { slug: string } } }>;
    }>('/api/v1/products?shop=clay-ember&limit=10');
    const wood = await expectOk<{
      data: Array<{ shop: { vendor: { slug: string } } }>;
    }>('/api/v1/products?shop=grain-groove&limit=10');

    expect(clay.data.length).toBeGreaterThan(0);
    expect(wood.data.length).toBeGreaterThan(0);
    expect(clay.data.every((p) => p.shop.vendor.slug === 'clay-ember')).toBe(true);
    expect(wood.data.every((p) => p.shop.vendor.slug === 'grain-groove')).toBe(true);
  });

  // Search/filter query should narrow results (ember mug title match).
  it('filters products by search query', async () => {
    const body = await expectOk<{ data: Array<{ title: string }> }>(
      '/api/v1/products?q=ember',
    );
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.some((p) => /ember/i.test(p.title))).toBe(true);
  });

  // Unknown shop slug should 404 rather than leak pending/suspended shops.
  it('returns 404 for unknown shop slug', async () => {
    const { status, body } = await api<{ error: { code: string } }>(
      '/api/v1/shops/does-not-exist-e2e',
    );
    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
