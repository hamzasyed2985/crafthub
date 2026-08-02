/**
 * PURPOSE: Vendor + admin edge cases — duplicate apply, slug clashes,
 * product patch/soft-delete/media, suspend, unpublish, unknown ids.
 */
import { describe, expect, it } from 'vitest';
import {
  adminSetVendorStatus,
  api,
  applyAsVendor,
  createApprovedVendor,
  createVendorProduct,
  expectOk,
  login,
  registerBuyer,
  SEED,
  uniqueId,
} from './helpers/api';

describe('e2e · vendor & admin edges', () => {
  // A user may only hold one vendor profile.
  it('rejects a second vendor application (ALREADY_APPLIED)', async () => {
    const buyer = await registerBuyer();
    await applyAsVendor(buyer.accessToken);
    // Need a fresh token? apply returns new token but old still auth's as vendor user.
    const session = await login(buyer.user.email, buyer.password);

    const { status, body } = await api<{ error: { code: string } }>('/api/v1/vendor/apply', {
      method: 'POST',
      token: session.data.accessToken,
      body: JSON.stringify({
        displayName: 'Second Try',
        slug: uniqueId('second'),
        city: 'Lahore',
        craftTags: ['woodwork'],
        attestation: true,
      }),
    });
    expect(status).toBe(409);
    expect(body.error.code).toBe('ALREADY_APPLIED');
  });

  // Shop slugs are globally unique.
  it('rejects vendor apply when shop slug is taken', async () => {
    const buyer = await registerBuyer();
    const { status, body } = await api<{ error: { code: string } }>('/api/v1/vendor/apply', {
      method: 'POST',
      token: buyer.accessToken,
      body: JSON.stringify({
        displayName: 'Clone Clay',
        slug: SEED.pottery.shopSlug,
        city: 'Karachi',
        craftTags: ['pottery'],
        attestation: true,
      }),
    });
    expect(status).toBe(409);
    expect(body.error.code).toBe('SLUG_TAKEN');
  });

  // Approved vendor can patch product fields and soft-delete (archive).
  it('patches a product then soft-deletes it to archived', async () => {
    const vendor = await createApprovedVendor();
    const product = await createVendorProduct(vendor.accessToken, {
      status: 'active',
      stockQty: 2,
    });

    const patched = await expectOk<{
      data: { product: { title: string; status: string } };
    }>(`/api/v1/vendor/products/${product.id}`, {
      method: 'PATCH',
      token: vendor.accessToken,
      body: JSON.stringify({ title: 'Updated E2E Title', status: 'active' }),
    });
    expect(patched.data.product.title).toBe('Updated E2E Title');

    const deleted = await expectOk<{ data: { product: { status: string } } }>(
      `/api/v1/vendor/products/${product.id}`,
      { method: 'DELETE', token: vendor.accessToken },
    );
    expect(deleted.data.product.status).toBe('archived');

    // Archived products disappear from the public PDP.
    const pub = await api<{ error: { code: string } }>(`/api/v1/products/${product.id}`);
    expect(pub.status).toBe(404);
  });

  // Duplicate product slug inside the same shop must fail.
  it('rejects creating a product with a duplicate slug in the shop', async () => {
    const vendor = await createApprovedVendor();
    const slug = uniqueId('dup');
    await createVendorProduct(vendor.accessToken, { slug, status: 'draft' });

    const { status, body } = await api<{ error: { code: string } }>('/api/v1/vendor/products', {
      method: 'POST',
      token: vendor.accessToken,
      body: JSON.stringify({
        title: 'Dup Title',
        slug,
        description: 'clash',
        status: 'draft',
        variants: [{ priceCents: 500, stockQty: 1, currency: 'USD', attributes: {} }],
      }),
    });
    expect(status).toBe(409);
    expect(body.error.code).toBe('SLUG_TAKEN');
  });

  // Media-by-URL attachment for Phase 1 (R2 later).
  it('attaches media by URL to a vendor product', async () => {
    const vendor = await createApprovedVendor();
    const product = await createVendorProduct(vendor.accessToken, { status: 'draft' });

    const { status, body } = await api<{
      data: { media: { url: string; alt: string } };
    }>(`/api/v1/vendor/products/${product.id}/media`, {
      method: 'POST',
      token: vendor.accessToken,
      body: JSON.stringify({
        url: 'https://example.com/e2e-mug.jpg',
        alt: 'E2E mug photo',
        sortOrder: 0,
      }),
    });
    expect(status).toBe(201);
    expect(body.data.media.url).toContain('example.com');
    expect(body.data.media.alt).toBe('E2E mug photo');
  });

  // Suspended vendors cannot manage products.
  it('blocks product create when vendor is suspended', async () => {
    const vendor = await createApprovedVendor();
    await adminSetVendorStatus(vendor.vendorId, 'suspended', 'e2e suspend vendor');

    const { status, body } = await api<{ error: { code: string } }>('/api/v1/vendor/products', {
      method: 'POST',
      token: vendor.accessToken,
      body: JSON.stringify({
        title: 'Should Fail',
        description: 'suspended',
        status: 'draft',
        variants: [{ priceCents: 1000, stockQty: 1, currency: 'USD', attributes: {} }],
      }),
    });
    expect(status).toBe(403);
    expect(body.error.code).toBe('VENDOR_SUSPENDED');
  });

  // Admin unpublish archives a product (soft remove from marketplace).
  it('admin can unpublish a product to archived', async () => {
    const vendor = await createApprovedVendor();
    const product = await createVendorProduct(vendor.accessToken, {
      status: 'active',
      stockQty: 3,
    });
    const admin = await login(SEED.admin.email, SEED.admin.password);

    const result = await expectOk<{ data: { id: string; status: string } }>(
      `/api/v1/admin/products/${product.id}/unpublish`,
      { method: 'POST', token: admin.data.accessToken },
    );
    expect(result.data.status).toBe('archived');
  });

  // Unknown vendor / product ids return NOT_FOUND for admin.
  it('admin gets 404 for unknown vendor and product', async () => {
    const admin = await login(SEED.admin.email, SEED.admin.password);
    const missingId = '00000000-0000-4000-8000-000000000077';

    const vendor = await api<{ error: { code: string } }>(
      `/api/v1/admin/vendors/${missingId}`,
      { token: admin.data.accessToken },
    );
    expect(vendor.status).toBe(404);
    expect(vendor.body.error.code).toBe('NOT_FOUND');

    const product = await api<{ error: { code: string } }>(
      `/api/v1/admin/products/${missingId}/unpublish`,
      { method: 'POST', token: admin.data.accessToken },
    );
    expect(product.status).toBe(404);
    expect(product.body.error.code).toBe('NOT_FOUND');
  });
});
