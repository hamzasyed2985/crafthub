/**
 * PURPOSE: Cover Phase 2 cart — multi-vendor grouping, stock checks, qty updates.
 * Verify gate: adding items from two different shops produces two vendor groups.
 */
import { describe, expect, it } from 'vitest';
import { api, expectOk, uniqueId } from './helpers/api';

type CartResponse = {
  data: {
    cart: {
      itemCount: number;
      totalCents: number;
      itemsSubtotalCents: number;
      shippingTotalCents: number;
      groups: Array<{
        vendor: { slug: string };
        items: Array<{ id: string; quantity: number; product: { slug: string } }>;
        subtotalCents: number;
        shippingCents: number;
      }>;
      warnings: unknown[];
    };
    cartSessionId?: string | null;
  };
};

async function variantIdForShopProduct(shopSlug: string, productSlug: string): Promise<string> {
  const shop = await expectOk<{
    data: {
      products: Array<{
        slug: string;
        variants: Array<{ id: string; stockQty: number }>;
      }>;
    };
  }>(`/api/v1/shops/${shopSlug}`);
  const product = shop.data.products.find((p) => p.slug === productSlug);
  if (!product?.variants[0]) {
    throw new Error(`Missing seeded product ${productSlug} in shop ${shopSlug}`);
  }
  return product.variants[0].id;
}

describe('e2e · cart (multi-vendor)', () => {
  // Empty guest cart can be created/fetched via X-Cart-Session.
  it('returns an empty cart for a new guest session', async () => {
    const session = uniqueId('cart');
    const body = await expectOk<CartResponse>('/api/v1/cart', { cartSession: session });
    expect(body.data.cart.itemCount).toBe(0);
    expect(body.data.cart.groups).toEqual([]);
  });

  // Core Phase 2 verify: items from two shops group under two vendors with shipping.
  it('groups line items by vendor when adding from two shops', async () => {
    const session = uniqueId('multi');
    const mugVariant = await variantIdForShopProduct('clay-ember', 'ember-mug');
    const boardVariant = await variantIdForShopProduct('grain-groove', 'walnut-board');

    await expectOk<CartResponse>('/api/v1/cart/items', {
      method: 'POST',
      cartSession: session,
      body: JSON.stringify({ variantId: mugVariant, qty: 1 }),
    });

    const body = await expectOk<CartResponse>('/api/v1/cart/items', {
      method: 'POST',
      cartSession: session,
      body: JSON.stringify({ variantId: boardVariant, qty: 2 }),
    });

    const cart = body.data.cart;
    expect(cart.itemCount).toBe(3);
    expect(cart.groups).toHaveLength(2);

    const slugs = cart.groups.map((g) => g.vendor.slug).sort();
    expect(slugs).toEqual(['clay-ember', 'grain-groove']);

    // Each vendor group should include its own flat shipping amount.
    for (const group of cart.groups) {
      expect(group.shippingCents).toBeGreaterThan(0);
      expect(group.subtotalCents).toBeGreaterThan(0);
    }
    expect(cart.totalCents).toBe(cart.itemsSubtotalCents + cart.shippingTotalCents);
  });

  // Stock enforcement: cannot request more units than available inventory.
  it('rejects add-to-cart when quantity exceeds stock', async () => {
    const session = uniqueId('stock');
    const mugVariant = await variantIdForShopProduct('clay-ember', 'ember-mug');

    const { status, body } = await api<{ error: { code: string; message: string } }>(
      '/api/v1/cart/items',
      {
        method: 'POST',
        cartSession: session,
        body: JSON.stringify({ variantId: mugVariant, qty: 99 }),
      },
    );

    expect(status).toBe(400);
    expect(body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  // PATCH qty=0 removes a line; totals recalculate.
  it('updates quantity and removes item when qty is 0', async () => {
    const session = uniqueId('qty');
    const mugVariant = await variantIdForShopProduct('clay-ember', 'ember-mug');

    const added = await expectOk<CartResponse>('/api/v1/cart/items', {
      method: 'POST',
      cartSession: session,
      body: JSON.stringify({ variantId: mugVariant, qty: 2 }),
    });
    const itemId = added.data.cart.groups[0]!.items[0]!.id;

    const updated = await expectOk<CartResponse>(`/api/v1/cart/items/${itemId}`, {
      method: 'PATCH',
      cartSession: session,
      body: JSON.stringify({ qty: 1 }),
    });
    expect(updated.data.cart.itemCount).toBe(1);

    const cleared = await expectOk<CartResponse>(`/api/v1/cart/items/${itemId}`, {
      method: 'PATCH',
      cartSession: session,
      body: JSON.stringify({ qty: 0 }),
    });
    expect(cleared.data.cart.itemCount).toBe(0);
    expect(cleared.data.cart.groups).toHaveLength(0);
  });

  // DELETE /cart clears all lines for the session.
  it('clears the entire cart', async () => {
    const session = uniqueId('clear');
    const mugVariant = await variantIdForShopProduct('clay-ember', 'ember-mug');
    await expectOk('/api/v1/cart/items', {
      method: 'POST',
      cartSession: session,
      body: JSON.stringify({ variantId: mugVariant, qty: 1 }),
    });

    const cleared = await expectOk<CartResponse>('/api/v1/cart', {
      method: 'DELETE',
      cartSession: session,
    });
    expect(cleared.data.cart.itemCount).toBe(0);
  });
});
