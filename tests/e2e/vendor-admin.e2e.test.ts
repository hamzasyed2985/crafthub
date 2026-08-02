/**
 * PURPOSE: Cover Phase 1 vendor apply + admin moderation.
 * Flow: buyer applies → pending vendor → admin approves → vendor can create products.
 */
import { describe, expect, it } from 'vitest';
import { api, expectOk, login, registerBuyer, SEED, uniqueId } from './helpers/api';

describe('e2e · vendor apply & admin approve', () => {
  // A logged-in customer can submit a vendor application (pending status).
  it('lets a customer apply as a vendor', async () => {
    const buyer = await registerBuyer();
    const slug = uniqueId('shop');

    const { status, body } = await api<{
      data: {
        vendor: { slug: string; status: string };
        accessToken: string;
        user: { role: string };
      };
    }>('/api/v1/vendor/apply', {
      method: 'POST',
      token: buyer.accessToken,
      body: JSON.stringify({
        displayName: `E2E Shop ${slug}`,
        slug,
        city: 'Islamabad',
        bio: 'Handmade test crafts for e2e.',
        craftTags: ['pottery'],
        attestation: true,
      }),
    });

    expect(status).toBe(201);
    expect(body.data.vendor.slug).toBe(slug);
    expect(body.data.vendor.status).toBe('pending');
    expect(body.data.user.role).toBe('vendor');
  });

  // Pending vendors must not publish products until an admin approves them.
  it('blocks product create while vendor is still pending', async () => {
    const buyer = await registerBuyer();
    const slug = uniqueId('pending');
    const applied = await expectOk<{ data: { accessToken: string } }>('/api/v1/vendor/apply', {
      method: 'POST',
      token: buyer.accessToken,
      body: JSON.stringify({
        displayName: `Pending ${slug}`,
        slug,
        city: 'Karachi',
        craftTags: ['jewelry'],
        attestation: true,
      }),
    });

    const { status, body } = await api<{ error: { code: string } }>('/api/v1/vendor/products', {
      method: 'POST',
      token: applied.data.accessToken,
      body: JSON.stringify({
        title: 'Should Fail',
        description: 'Pending vendor cannot publish',
        status: 'draft',
        variants: [{ priceCents: 1000, stockQty: 1, currency: 'USD', attributes: {} }],
      }),
    });

    expect(status).toBe(403);
    expect(body.error.code).toBe('VENDOR_NOT_APPROVED');
  });

  // Admin can approve a pending application; shop then appears publicly.
  it('admin approves vendor and shop becomes public', async () => {
    const buyer = await registerBuyer();
    const slug = uniqueId('approve');
    await expectOk('/api/v1/vendor/apply', {
      method: 'POST',
      token: buyer.accessToken,
      body: JSON.stringify({
        displayName: `Approve Me ${slug}`,
        slug,
        city: 'Lahore',
        craftTags: ['textiles'],
        attestation: true,
      }),
    });

    const admin = await login(SEED.admin.email, SEED.admin.password);
    expect(admin.data.user.role).toBe('admin');

    const pending = await expectOk<{
      data: Array<{ id: string; slug: string; status: string }>;
    }>('/api/v1/admin/vendors?status=pending', { token: admin.data.accessToken });

    const target = pending.data.find((v) => v.slug === slug);
    expect(target).toBeTruthy();

    const patched = await expectOk<{ data: { vendor: { status: string; slug: string } } }>(
      `/api/v1/admin/vendors/${target!.id}`,
      {
        method: 'PATCH',
        token: admin.data.accessToken,
        body: JSON.stringify({ status: 'approved', reason: 'e2e approval' }),
      },
    );
    expect(patched.data.vendor.status).toBe('approved');

    // Public catalog should now include the newly approved shop.
    const shop = await expectOk<{ data: { shop: { slug: string } } }>(`/api/v1/shops/${slug}`);
    expect(shop.data.shop.slug).toBe(slug);
  });

  // Approved seed vendor can CRUD products (create + list).
  it('approved vendor can create and list a product', async () => {
    const vendor = await login(SEED.pottery.email, SEED.pottery.password);
    const title = `E2E Bowl ${uniqueId('bowl')}`;
    const productSlug = uniqueId('bowl');

    const created = await expectOk<{
      data: { product: { id: string; title: string; status: string } };
    }>('/api/v1/vendor/products', {
      method: 'POST',
      token: vendor.data.accessToken,
      body: JSON.stringify({
        title,
        slug: productSlug,
        description: 'Created by e2e suite',
        status: 'draft',
        variants: [
          {
            sku: 'E2E-BOWL',
            priceCents: 1500,
            currency: 'USD',
            stockQty: 5,
            attributes: { size: 'small' },
          },
        ],
      }),
    });

    expect(created.data.product.title).toBe(title);
    expect(created.data.product.status).toBe('draft');

    const list = await expectOk<{ data: Array<{ id: string }> }>('/api/v1/vendor/products', {
      token: vendor.data.accessToken,
    });
    expect(list.data.some((p) => p.id === created.data.product.id)).toBe(true);
  });

  // Non-admins must not access admin vendor endpoints.
  it('forbids non-admin from listing admin vendors', async () => {
    const buyer = await registerBuyer();
    const { status, body } = await api<{ error: { code: string } }>('/api/v1/admin/vendors', {
      token: buyer.accessToken,
    });
    expect(status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });
});
