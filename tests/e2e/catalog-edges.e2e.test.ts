/**
 * PURPOSE: Catalog edge cases — unknown product, category filter,
 * and ensuring pending/suspended shops stay hidden from public lists.
 */
import { describe, expect, it } from 'vitest';
import {
  adminSetVendorStatus,
  api,
  applyAsVendor,
  createApprovedVendor,
  createVendorProduct,
  expectOk,
  registerBuyer,
  uniqueId,
} from './helpers/api';

describe('e2e · catalog edges', () => {
  // Unknown / non-public product ids must 404.
  it('returns 404 for unknown product id', async () => {
    const { status, body } = await api<{ error: { code: string } }>(
      '/api/v1/products/00000000-0000-4000-8000-000000000066',
    );
    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  // Draft products are not reachable via public PDP even with a known id.
  it('returns 404 for draft product on public PDP', async () => {
    const vendor = await createApprovedVendor();
    const draft = await createVendorProduct(vendor.accessToken, { status: 'draft' });

    const { status, body } = await api<{ error: { code: string } }>(
      `/api/v1/products/${draft.id}`,
    );
    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  // Category query param filters marketplace feed by category slug.
  it('filters products by category slug', async () => {
    const cats = await expectOk<{ data: Array<{ id: string; slug: string }> }>(
      '/api/v1/categories',
    );
    const pottery = cats.data.find((c) => c.slug === 'pottery');
    expect(pottery).toBeTruthy();

    const vendor = await createApprovedVendor();
    const titled = `Pottery Filter ${uniqueId('cat')}`;
    await createVendorProduct(vendor.accessToken, {
      title: titled,
      status: 'active',
      categoryId: pottery!.id,
      stockQty: 2,
    });

    const body = await expectOk<{ data: Array<{ title: string; category: { slug: string } | null }> }>(
      '/api/v1/products?category=pottery',
    );
    expect(body.data.some((p) => p.title === titled)).toBe(true);
    expect(body.data.every((p) => p.category?.slug === 'pottery')).toBe(true);
  });

  // Pending shops must not appear in /shops or resolve by slug.
  it('hides pending shops from public catalog', async () => {
    const buyer = await registerBuyer();
    const applied = await applyAsVendor(buyer.accessToken);
    const slug = applied.slug;

    const list = await expectOk<{ data: Array<{ slug: string }> }>('/api/v1/shops');
    expect(list.data.some((s) => s.slug === slug)).toBe(false);

    const detail = await api<{ error: { code: string } }>(`/api/v1/shops/${slug}`);
    expect(detail.status).toBe(404);
    expect(detail.body.error.code).toBe('NOT_FOUND');
  });

  // Suspended shops drop out of public listing and shop detail.
  it('hides suspended shops from public catalog', async () => {
    const vendor = await createApprovedVendor();
    await createVendorProduct(vendor.accessToken, { status: 'active', stockQty: 1 });
    await adminSetVendorStatus(vendor.vendorId, 'suspended', 'e2e hide shop');

    const list = await expectOk<{ data: Array<{ slug: string }> }>('/api/v1/shops');
    expect(list.data.some((s) => s.slug === vendor.slug)).toBe(false);

    const detail = await api<{ error: { code: string } }>(`/api/v1/shops/${vendor.slug}`);
    expect(detail.status).toBe(404);
    expect(detail.body.error.code).toBe('NOT_FOUND');
  });
});
