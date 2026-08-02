/**
 * PURPOSE: Combined Phase 0–3 journey — one scripted path that proves the
 * marketplace works end-to-end: health → auth → vendor apply/approve → Stripe
 * Connect → catalog → multi-vendor cart → checkout → webhook paid → buyer &
 * vendor order visibility.
 *
 * Run with API up: `pnpm test:e2e` (mock Stripe via empty secret / E2E_STRIPE_MOCK=1).
 */
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  adminSetVendorStatus,
  api,
  applyAsVendor,
  createVendorProduct,
  expectOk,
  login,
  registerBuyer,
  SEED,
  uniqueId,
} from './helpers/api';

describe('e2e · Phase 0–3 combined journey', () => {
  it('runs foundation → vendor → catalog → cart → Connect → paid order', async () => {
    // --- Phase 0: platform alive ---
    const health = await expectOk<{ status: string }>('/health');
    expect(health.status).toBe('ok');
    const ready = await expectOk<{ status: string }>('/ready');
    expect(ready.status).toBe('ready');

    // --- Phase 0: auth ---
    const maker = await registerBuyer({ name: 'Journey Maker' });
    const buyer = await registerBuyer({ name: 'Journey Buyer' });
    const me = await expectOk<{ data: { user: { email: string } } }>('/api/v1/auth/me', {
      token: buyer.accessToken,
    });
    expect(me.data.user.email).toBe(buyer.user.email);

    // --- Phase 1: vendor apply + admin approve ---
    const slug = uniqueId('journey');
    const applied = await applyAsVendor(maker.accessToken, {
      slug,
      displayName: `Journey Studio ${slug}`,
    });
    expect(applied.vendor.status).toBe('pending');

    // Pending shop hidden from public catalog
    const pendingShop = await api(`/api/v1/shops/${slug}`);
    expect(pendingShop.status).toBe(404);

    await adminSetVendorStatus(applied.vendor.id, 'approved', 'journey approve');

    const publicShop = await expectOk<{ data: { shop: { slug: string } } }>(
      `/api/v1/shops/${slug}`,
    );
    expect(publicShop.data.shop.slug).toBe(slug);

    // Re-login so vendor token is fresh after role change
    const makerSession = await login(maker.user.email, maker.password);

    // --- Phase 3 (early): Stripe Connect so products are payable ---
    const onboard = await expectOk<{
      data: { stripe: { chargesEnabled: boolean }; url: string };
    }>('/api/v1/vendor/stripe/onboard', {
      method: 'POST',
      token: makerSession.data.accessToken,
    });
    expect(onboard.data.stripe.chargesEnabled).toBe(true);

    // Also ensure seeded second vendor is payable for multi-vendor cart
    await expectOk('/api/v1/vendor/stripe/onboard', {
      method: 'POST',
      token: (await login(SEED.wood.email, SEED.wood.password)).data.accessToken,
    });

    // --- Phase 1: catalog product ---
    const cats = await expectOk<{ data: Array<{ id: string; slug: string }> }>(
      '/api/v1/categories',
    );
    const pottery = cats.data.find((c) => c.slug === 'pottery');
    expect(pottery).toBeTruthy();

    const product = await createVendorProduct(makerSession.data.accessToken, {
      title: `Journey Mug ${slug}`,
      slug: uniqueId('jmug'),
      status: 'active',
      stockQty: 8,
      priceCents: 2800,
      categoryId: pottery!.id,
    });
    expect(product.variants[0]?.id).toBeTruthy();

    const pdp = await expectOk<{ data: { product: { id: string; status: string } } }>(
      `/api/v1/products/${product.id}`,
    );
    expect(pdp.data.product.status).toBe('active');

    // --- Phase 2: multi-vendor cart (journey product + seeded wood board) ---
    const woodShop = await expectOk<{
      data: {
        products: Array<{ slug: string; variants: Array<{ id: string }> }>;
      };
    }>('/api/v1/shops/grain-groove');
    const boardVariant = woodShop.data.products.find((p) => p.slug === 'walnut-board')
      ?.variants[0]?.id;
    expect(boardVariant).toBeTruthy();

    await expectOk('/api/v1/cart/items', {
      method: 'POST',
      token: buyer.accessToken,
      body: JSON.stringify({ variantId: product.variants[0]!.id, qty: 2 }),
    });
    const cart = await expectOk<{
      data: {
        cart: {
          itemCount: number;
          groups: Array<{ vendor: { slug: string }; shippingCents: number }>;
          totalCents: number;
        };
      };
    }>('/api/v1/cart/items', {
      method: 'POST',
      token: buyer.accessToken,
      body: JSON.stringify({ variantId: boardVariant, qty: 1 }),
    });

    expect(cart.data.cart.itemCount).toBe(3);
    expect(cart.data.cart.groups).toHaveLength(2);
    const vendorSlugs = cart.data.cart.groups.map((g) => g.vendor.slug).sort();
    expect(vendorSlugs).toEqual([slug, 'grain-groove'].sort());
    expect(cart.data.cart.totalCents).toBeGreaterThan(0);

    // --- Phase 3: checkout session + mock webhook → paid ---
    const stockBefore = product.variants[0]!.stockQty;

    const checkout = await expectOk<{
      data: {
        orderId: string;
        checkoutSessionId: string;
        checkoutUrl: string;
        order: { status: string; totalCents: number; vendorOrders: unknown[] };
      };
    }>('/api/v1/checkout/session', {
      method: 'POST',
      token: buyer.accessToken,
      headers: { 'Idempotency-Key': uniqueId('journey-idem') },
      body: JSON.stringify({
        shipping: {
          name: 'Journey Buyer',
          line1: '100 Market St',
          city: 'Austin',
          region: 'TX',
          postalCode: '78701',
          country: 'US',
        },
      }),
    });

    expect(checkout.data.order.status).toBe('pending_payment');
    expect(checkout.data.order.vendorOrders).toHaveLength(2);
    expect(checkout.data.checkoutUrl).toContain(checkout.data.orderId);

    const eventId = `evt_journey_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const webhook = await api<{ received: boolean; processed: boolean }>(
      '/webhooks/stripe/test',
      {
        method: 'POST',
        body: JSON.stringify({
          id: eventId,
          object: 'event',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: checkout.data.checkoutSessionId,
              object: 'checkout.session',
              payment_status: 'paid',
              metadata: { orderId: checkout.data.orderId },
              client_reference_id: checkout.data.orderId,
              payment_intent: `pi_journey_${eventId.slice(-10)}`,
            },
          },
        }),
      },
    );
    expect(webhook.status).toBe(200);
    expect(webhook.body.processed).toBe(true);

    // Idempotent replay
    const replay = await api<{ processed: boolean }>('/webhooks/stripe/test', {
      method: 'POST',
      body: JSON.stringify({
        id: eventId,
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: checkout.data.checkoutSessionId,
            object: 'checkout.session',
            payment_status: 'paid',
            metadata: { orderId: checkout.data.orderId },
            client_reference_id: checkout.data.orderId,
          },
        },
      }),
    });
    expect(replay.body.processed).toBe(false);

    // Buyer order paid
    const order = await expectOk<{
      data: {
        order: {
          status: string;
          vendorOrders: Array<{
            status: string;
            vendor: { slug: string };
            transfer: { status: string } | null;
          }>;
        };
      };
    }>(`/api/v1/orders/${checkout.data.orderId}`, { token: buyer.accessToken });
    expect(order.data.order.status).toBe('paid');
    expect(order.data.order.vendorOrders.every((v) => v.status === 'paid')).toBe(true);
    expect(order.data.order.vendorOrders.every((v) => v.transfer?.status === 'paid')).toBe(
      true,
    );

    // Cart cleared
    const emptyCart = await expectOk<{ data: { cart: { itemCount: number } } }>('/api/v1/cart', {
      token: buyer.accessToken,
    });
    expect(emptyCart.data.cart.itemCount).toBe(0);

    // Stock decremented on journey product
    const afterPdp = await expectOk<{
      data: { product: { variants: Array<{ stockQty: number }> } };
    }>(`/api/v1/products/${product.id}`);
    expect(afterPdp.data.product.variants[0]!.stockQty).toBe(stockBefore - 2);

    // Vendor sees paid slice
    const vendorOrders = await expectOk<{
      data: Array<{ status: string; order: { id: string } }>;
    }>('/api/v1/vendor/orders', { token: makerSession.data.accessToken });
    expect(
      vendorOrders.data.some(
        (vo) => vo.order.id === checkout.data.orderId && vo.status === 'paid',
      ),
    ).toBe(true);

    // Buyer order list includes it
    const buyerOrders = await expectOk<{ data: Array<{ id: string; status: string }> }>(
      '/api/v1/orders',
      { token: buyer.accessToken },
    );
    expect(buyerOrders.data.some((o) => o.id === checkout.data.orderId && o.status === 'paid')).toBe(
      true,
    );
  });
});
