/**
 * PURPOSE: Phase 3 checkout & Connect — onboard gate, session create, webhook paid,
 * stock decrement, transfer rows, and idempotent webhook replay.
 */
import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  api,
  expectOk,
  login,
  registerBuyer,
  SEED,
  uniqueId,
  variantIdForShopProduct,
} from './helpers/api';

type CheckoutResult = {
  data: {
    orderId: string;
    checkoutUrl: string;
    checkoutSessionId: string;
    order: { status: string; totalCents: number };
  };
};

type OrderResult = {
  data: {
    order: {
      id: string;
      status: string;
      totalCents: number;
      vendorOrders: Array<{
        status: string;
        vendorNetCents: number;
        transfer: { status: string; stripeTransferId: string | null } | null;
      }>;
    };
  };
};

async function enableVendorStripe(email: string, password: string) {
  const session = await login(email, password);
  const onboard = await expectOk<{
    data: { stripe: { chargesEnabled: boolean }; url: string };
  }>('/api/v1/vendor/stripe/onboard', {
    method: 'POST',
    token: session.data.accessToken,
  });
  expect(onboard.data.stripe.chargesEnabled).toBe(true);
  return session.data.accessToken;
}

async function addSeedItemsToUserCart(token: string) {
  const mug = await variantIdForShopProduct('clay-ember', 'ember-mug');
  const board = await variantIdForShopProduct('grain-groove', 'walnut-board');
  await expectOk('/api/v1/cart/items', {
    method: 'POST',
    token,
    body: JSON.stringify({ variantId: mug, qty: 1 }),
  });
  await expectOk('/api/v1/cart/items', {
    method: 'POST',
    token,
    body: JSON.stringify({ variantId: board, qty: 1 }),
  });
}

async function postMockPaidWebhook(orderId: string, checkoutSessionId: string, eventId?: string) {
  const id = eventId ?? `evt_e2e_${randomUUID().replace(/-/g, '').slice(0, 18)}`;
  return api<{ received: boolean; processed: boolean }>('/webhooks/stripe/test', {
    method: 'POST',
    body: JSON.stringify({
      id,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: checkoutSessionId,
          object: 'checkout.session',
          payment_status: 'paid',
          metadata: { orderId },
          client_reference_id: orderId,
          payment_intent: `pi_e2e_${id.slice(-12)}`,
        },
      },
    }),
  });
}

describe('e2e · checkout & connect', () => {
  beforeAll(async () => {
    // Seed makers must be payable before multi-vendor checkout.
    await enableVendorStripe(SEED.pottery.email, SEED.pottery.password);
    await enableVendorStripe(SEED.wood.email, SEED.wood.password);
  });

  // Vendors without charges_enabled cannot sell through checkout.
  it('rejects checkout when a cart vendor is not Stripe-payable', async () => {
    const buyer = await registerBuyer();
    // Fresh approved vendor without onboard — create product active, add to cart.
    const applied = await expectOk<{
      data: { accessToken: string; vendor: { id: string } };
    }>('/api/v1/vendor/apply', {
      method: 'POST',
      token: buyer.accessToken,
      body: JSON.stringify({
        displayName: `No Stripe ${uniqueId('ns')}`,
        slug: uniqueId('nos'),
        city: 'Karachi',
        craftTags: ['pottery'],
        attestation: true,
      }),
    });

    const admin = await login(SEED.admin.email, SEED.admin.password);
    await expectOk(`/api/v1/admin/vendors/${applied.data.vendor.id}`, {
      method: 'PATCH',
      token: admin.data.accessToken,
      body: JSON.stringify({ status: 'approved', reason: 'e2e' }),
    });

    const vendorSession = await login(buyer.user.email, buyer.password);
    const product = await expectOk<{
      data: { product: { variants: Array<{ id: string }> } };
    }>('/api/v1/vendor/products', {
      method: 'POST',
      token: vendorSession.data.accessToken,
      body: JSON.stringify({
        title: 'Unpayable Bowl',
        slug: uniqueId('ub'),
        description: 'no stripe',
        status: 'active',
        variants: [{ priceCents: 900, stockQty: 3, currency: 'USD', attributes: {} }],
      }),
    });

    const shopper = await registerBuyer();
    await expectOk('/api/v1/cart/items', {
      method: 'POST',
      token: shopper.accessToken,
      body: JSON.stringify({ variantId: product.data.product.variants[0]!.id, qty: 1 }),
    });

    const { status, body } = await api<{ error: { code: string } }>('/api/v1/checkout/session', {
      method: 'POST',
      token: shopper.accessToken,
      body: JSON.stringify({
        shipping: {
          name: 'Buyer',
          line1: '1 Test St',
          city: 'Austin',
          postalCode: '78701',
          country: 'US',
        },
      }),
    });
    expect(status).toBe(400);
    expect(body.error.code).toBe('VENDOR_NOT_PAYABLE');
  });

  // Empty cart cannot start checkout.
  it('rejects checkout for an empty cart', async () => {
    const buyer = await registerBuyer();
    const { status, body } = await api<{ error: { code: string } }>('/api/v1/checkout/session', {
      method: 'POST',
      token: buyer.accessToken,
      body: JSON.stringify({
        shipping: {
          name: 'Buyer',
          line1: '1 Test St',
          city: 'Austin',
          postalCode: '78701',
          country: 'US',
        },
      }),
    });
    expect(status).toBe(400);
    expect(body.error.code).toBe('CART_EMPTY');
  });

  // Happy path: multi-vendor cart → session → mock webhook → paid + transfers.
  it('creates checkout session and marks order paid via mock webhook', async () => {
    const buyer = await registerBuyer();
    await addSeedItemsToUserCart(buyer.accessToken);

    const stockBefore = await expectOk<{
      data: { products: Array<{ slug: string; variants: Array<{ stockQty: number }> }> };
    }>('/api/v1/shops/clay-ember');
    const mugBefore = stockBefore.data.products.find((p) => p.slug === 'ember-mug')!.variants[0]!
      .stockQty;

    const checkout = await expectOk<CheckoutResult>('/api/v1/checkout/session', {
      method: 'POST',
      token: buyer.accessToken,
      headers: { 'Idempotency-Key': uniqueId('idem') },
      body: JSON.stringify({
        shipping: {
          name: 'E2E Buyer',
          line1: '42 Craft Lane',
          city: 'Austin',
          region: 'TX',
          postalCode: '78701',
          country: 'US',
        },
      }),
    });

    expect(checkout.data.orderId).toBeTruthy();
    expect(checkout.data.checkoutUrl).toContain('orderId=');
    expect(checkout.data.order.status).toBe('pending_payment');
    expect(checkout.data.order.totalCents).toBeGreaterThan(0);

    const eventId = `evt_paid_${checkout.data.orderId.replace(/-/g, '').slice(0, 16)}`;
    const wh = await postMockPaidWebhook(
      checkout.data.orderId,
      checkout.data.checkoutSessionId,
      eventId,
    );
    expect(wh.status).toBe(200);
    expect(wh.body.processed).toBe(true);

    // Replay same event id — must be idempotent (processed: false).
    const replay = await postMockPaidWebhook(
      checkout.data.orderId,
      checkout.data.checkoutSessionId,
      eventId,
    );
    expect(replay.status).toBe(200);
    expect(replay.body.processed).toBe(false);

    const order = await expectOk<OrderResult>(`/api/v1/orders/${checkout.data.orderId}`, {
      token: buyer.accessToken,
    });
    expect(order.data.order.status).toBe('paid');
    expect(order.data.order.vendorOrders).toHaveLength(2);
    expect(order.data.order.vendorOrders.every((v) => v.status === 'paid')).toBe(true);
    expect(order.data.order.vendorOrders.every((v) => v.transfer?.status === 'paid')).toBe(true);

    const stockAfter = await expectOk<{
      data: { products: Array<{ slug: string; variants: Array<{ stockQty: number }> }> };
    }>('/api/v1/shops/clay-ember');
    const mugAfter = stockAfter.data.products.find((p) => p.slug === 'ember-mug')!.variants[0]!
      .stockQty;
    expect(mugAfter).toBe(mugBefore - 1);

    // Cart cleared after pay.
    const cart = await expectOk<{ data: { cart: { itemCount: number } } }>('/api/v1/cart', {
      token: buyer.accessToken,
    });
    expect(cart.data.cart.itemCount).toBe(0);

    // Vendor can list the paid slice.
    const potteryToken = await login(SEED.pottery.email, SEED.pottery.password);
    const vendorOrders = await expectOk<{
      data: Array<{ status: string; order: { id: string } }>;
    }>('/api/v1/vendor/orders', { token: potteryToken.data.accessToken });
    expect(
      vendorOrders.data.some(
        (vo) => vo.order.id === checkout.data.orderId && vo.status === 'paid',
      ),
    ).toBe(true);
  });

  // Unauthenticated buyers cannot checkout.
  it('rejects checkout without auth', async () => {
    const { status, body } = await api<{ error: { code: string } }>('/api/v1/checkout/session', {
      method: 'POST',
      body: JSON.stringify({
        shipping: {
          name: 'Anon',
          line1: '1 St',
          city: 'X',
          postalCode: '00000',
          country: 'US',
        },
      }),
    });
    expect(status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});
