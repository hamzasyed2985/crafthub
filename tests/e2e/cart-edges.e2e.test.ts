/**
 * PURPOSE: Cart edge cases — unavailable variants/shops, stock on PATCH,
 * missing item ids, authenticated carts, and invalid payloads.
 */
import { describe, expect, it } from 'vitest';
import {
  adminSetVendorStatus,
  api,
  createApprovedVendor,
  createVendorProduct,
  expectOk,
  registerBuyer,
  uniqueId,
  variantIdForShopProduct,
} from './helpers/api';

type CartResponse = {
  data: {
    cart: {
      itemCount: number;
      groups: Array<{
        items: Array<{ id: string; quantity: number }>;
      }>;
    };
  };
};

describe('e2e · cart edges', () => {
  // Unknown UUID must 404 as VARIANT_NOT_FOUND, not create a phantom line.
  it('rejects add for unknown variant id', async () => {
    const session = uniqueId('bad-var');
    const { status, body } = await api<{ error: { code: string } }>('/api/v1/cart/items', {
      method: 'POST',
      cartSession: session,
      body: JSON.stringify({
        variantId: '00000000-0000-4000-8000-000000000099',
        qty: 1,
      }),
    });
    expect(status).toBe(404);
    expect(body.error.code).toBe('VARIANT_NOT_FOUND');
  });

  // Draft / non-active products are not purchasable.
  it('rejects add for unpublished (draft) product', async () => {
    const vendor = await createApprovedVendor();
    const draft = await createVendorProduct(vendor.accessToken, {
      status: 'draft',
      stockQty: 3,
    });
    const variantId = draft.variants[0]!.id;
    const session = uniqueId('draft-cart');

    const { status, body } = await api<{ error: { code: string } }>('/api/v1/cart/items', {
      method: 'POST',
      cartSession: session,
      body: JSON.stringify({ variantId, qty: 1 }),
    });
    expect(status).toBe(400);
    expect(body.error.code).toBe('PRODUCT_UNAVAILABLE');
  });

  // Zero stock active product → OUT_OF_STOCK.
  it('rejects add when variant is out of stock', async () => {
    const vendor = await createApprovedVendor();
    const product = await createVendorProduct(vendor.accessToken, {
      status: 'active',
      stockQty: 0,
    });
    const session = uniqueId('oos');

    const { status, body } = await api<{ error: { code: string } }>('/api/v1/cart/items', {
      method: 'POST',
      cartSession: session,
      body: JSON.stringify({ variantId: product.variants[0]!.id, qty: 1 }),
    });
    expect(status).toBe(400);
    expect(body.error.code).toBe('OUT_OF_STOCK');
  });

  // Suspended vendor shop must not accept new cart adds.
  it('rejects add when shop vendor is suspended', async () => {
    const vendor = await createApprovedVendor();
    const product = await createVendorProduct(vendor.accessToken, {
      status: 'active',
      stockQty: 4,
    });
    await adminSetVendorStatus(vendor.vendorId, 'suspended', 'e2e suspend for cart');

    const session = uniqueId('susp-cart');
    const { status, body } = await api<{ error: { code: string } }>('/api/v1/cart/items', {
      method: 'POST',
      cartSession: session,
      body: JSON.stringify({ variantId: product.variants[0]!.id, qty: 1 }),
    });
    expect(status).toBe(400);
    expect(body.error.code).toBe('SHOP_UNAVAILABLE');
  });

  // PATCH must enforce stock the same way as POST.
  it('rejects patch quantity above stock', async () => {
    const session = uniqueId('patch-stock');
    const mugVariant = await variantIdForShopProduct('clay-ember', 'ember-mug');

    const added = await expectOk<CartResponse>('/api/v1/cart/items', {
      method: 'POST',
      cartSession: session,
      body: JSON.stringify({ variantId: mugVariant, qty: 1 }),
    });
    const itemId = added.data.cart.groups[0]!.items[0]!.id;

    const { status, body } = await api<{ error: { code: string } }>(
      `/api/v1/cart/items/${itemId}`,
      {
        method: 'PATCH',
        cartSession: session,
        body: JSON.stringify({ qty: 99 }),
      },
    );
    expect(status).toBe(400);
    expect(body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  // Deleting a non-existent / wrong-cart item returns NOT_FOUND.
  it('returns 404 when deleting a missing cart item', async () => {
    const session = uniqueId('missing-item');
    await expectOk('/api/v1/cart', { cartSession: session });

    const { status, body } = await api<{ error: { code: string } }>(
      '/api/v1/cart/items/00000000-0000-4000-8000-000000000088',
      { method: 'DELETE', cartSession: session },
    );
    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  // Authenticated buyers get a user-scoped cart (no guest session required).
  it('lets an authenticated user add and read their cart', async () => {
    const buyer = await registerBuyer();
    const mugVariant = await variantIdForShopProduct('clay-ember', 'ember-mug');

    const added = await expectOk<CartResponse>('/api/v1/cart/items', {
      method: 'POST',
      token: buyer.accessToken,
      body: JSON.stringify({ variantId: mugVariant, qty: 2 }),
    });
    expect(added.data.cart.itemCount).toBe(2);

    const cart = await expectOk<CartResponse>('/api/v1/cart', {
      token: buyer.accessToken,
    });
    expect(cart.data.cart.itemCount).toBe(2);
  });

  // Zod rejects qty=0 on add (must use PATCH/DELETE to remove).
  it('rejects invalid add payload (qty 0)', async () => {
    const session = uniqueId('bad-qty');
    const mugVariant = await variantIdForShopProduct('clay-ember', 'ember-mug');
    const { status, body } = await api<{ error: { code: string } }>('/api/v1/cart/items', {
      method: 'POST',
      cartSession: session,
      body: JSON.stringify({ variantId: mugVariant, qty: 0 }),
    });
    expect(status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
