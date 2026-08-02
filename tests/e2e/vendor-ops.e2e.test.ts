/**
 * PURPOSE: Phase 4 vendor ops — fulfill/ship state machine, earnings, dashboard,
 * buyer-visible tracking, and cross-vendor isolation.
 */
import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  api,
  createApprovedVendor,
  createVendorProduct,
  expectOk,
  login,
  registerBuyer,
  SEED,
  uniqueId,
} from './helpers/api';

type CheckoutResult = {
  data: {
    orderId: string;
    checkoutSessionId: string;
    order: { status: string; totalCents: number };
  };
};

type VendorOrderRow = {
  id: string;
  status: string;
  vendorNetCents: number;
  itemsSubtotalCents: number;
  order: {
    shipName: string;
    shipLine1: string;
    shipCity: string;
    shipPostalCode: string;
    shipCountry: string;
  };
  trackingNumber: string | null;
  carrier: string | null;
};

async function enableVendorStripe(token: string) {
  const onboard = await expectOk<{
    data: { stripe: { chargesEnabled: boolean }; url: string };
  }>('/api/v1/vendor/stripe/onboard', {
    method: 'POST',
    token,
  });
  expect(onboard.data.stripe.chargesEnabled).toBe(true);
}

async function postMockPaidWebhook(orderId: string, checkoutSessionId: string) {
  const id = `evt_ops_${randomUUID().replace(/-/g, '').slice(0, 18)}`;
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
          payment_intent: `pi_ops_${id.slice(-12)}`,
        },
      },
    }),
  });
}

async function checkoutPaidOrder(
  buyerToken: string,
  variantId: string,
  shipName: string,
) {
  await expectOk('/api/v1/cart/items', {
    method: 'POST',
    token: buyerToken,
    body: JSON.stringify({ variantId, qty: 1 }),
  });

  const checkout = await expectOk<CheckoutResult>('/api/v1/checkout/session', {
    method: 'POST',
    token: buyerToken,
    body: JSON.stringify({
      shipping: {
        name: shipName,
        line1: '12 Fulfillment Ave',
        line2: 'Suite B',
        city: 'Lahore',
        region: 'Punjab',
        postalCode: '54000',
        country: 'PK',
      },
    }),
  });

  const wh = await postMockPaidWebhook(
    checkout.data.orderId,
    checkout.data.checkoutSessionId,
  );
  expect(wh.status).toBe(200);

  return checkout.data;
}

describe('e2e · vendor ops (phase 4)', () => {
  let makerToken: string;
  let makerVariantId: string;
  let otherVendorToken: string;

  beforeAll(async () => {
    // Prefer seeded pottery maker (already has products); ensure Stripe payable.
    const pottery = await login(SEED.pottery.email, SEED.pottery.password);
    makerToken = pottery.data.accessToken;
    await enableVendorStripe(makerToken);

    const shop = await expectOk<{
      data: {
        products: Array<{
          slug: string;
          status: string;
          variants: Array<{ id: string }>;
        }>;
      };
    }>(`/api/v1/shops/${SEED.pottery.shopSlug}`);
    const mug = shop.data.products.find((p) => p.slug === 'ember-mug');
    if (!mug?.variants[0]) throw new Error('Missing ember-mug');
    makerVariantId = mug.variants[0].id;

    const other = await createApprovedVendor();
    otherVendorToken = other.accessToken;
    await enableVendorStripe(otherVendorToken);
    await createVendorProduct(otherVendorToken, {
      status: 'active',
      slug: uniqueId('other-ops'),
      stockQty: 3,
    });
  });

  it('fulfills and ships a paid order; buyer sees tracking; earnings update', async () => {
    const buyer = await registerBuyer();
    const shipName = uniqueId('ops-buyer');
    const checkout = await checkoutPaidOrder(buyer.accessToken, makerVariantId, shipName);

    const buyerOrderBefore = await expectOk<{
      data: {
        order: {
          vendorOrders: Array<{ id: string; status: string; itemsSubtotalCents: number; vendorNetCents: number }>;
        };
      };
    }>(`/api/v1/orders/${checkout.orderId}`, { token: buyer.accessToken });
    const paidSlice = buyerOrderBefore.data.order.vendorOrders.find((v) => v.status === 'paid');
    expect(paidSlice).toBeTruthy();
    const vendorOrderId = paidSlice!.id;

    const dashBefore = await expectOk<{
      data: { ordersToFulfill: number; net7dCents: number };
    }>('/api/v1/vendor/dashboard', { token: makerToken });

    // Full shipping address on detail
    const detail = await expectOk<{ data: { vendorOrder: VendorOrderRow } }>(
      `/api/v1/vendor/orders/${vendorOrderId}`,
      { token: makerToken },
    );
    expect(detail.data.vendorOrder.status).toBe('paid');
    expect(detail.data.vendorOrder.order.shipName).toBe(shipName);
    expect(detail.data.vendorOrder.order.shipLine1).toBe('12 Fulfillment Ave');
    expect(detail.data.vendorOrder.order.shipPostalCode).toBe('54000');
    expect(detail.data.vendorOrder.order.shipCity).toBe('Lahore');

    const listed = await expectOk<{ data: VendorOrderRow[] }>(
      '/api/v1/vendor/orders?status=paid',
      { token: makerToken },
    );
    expect(listed.data.some((row) => row.id === vendorOrderId)).toBe(true);

    // Other vendor cannot access
    const denied = await api(`/api/v1/vendor/orders/${vendorOrderId}`, {
      token: otherVendorToken,
    });
    expect(denied.status).toBe(404);

    const fulfill = await expectOk<{ data: { vendorOrder: { status: string } } }>(
      `/api/v1/vendor/orders/${vendorOrderId}/fulfill`,
      { method: 'POST', token: makerToken, body: '{}' },
    );
    expect(fulfill.data.vendorOrder.status).toBe('fulfilling');

    const fulfillAgain = await api<{ error: { code: string } }>(
      `/api/v1/vendor/orders/${vendorOrderId}/fulfill`,
      { method: 'POST', token: makerToken, body: '{}' },
    );
    expect(fulfillAgain.status).toBe(400);
    expect(fulfillAgain.body.error.code).toBe('INVALID_STATUS');

    const ship = await expectOk<{
      data: { vendorOrder: { status: string; trackingNumber: string | null; carrier: string | null } };
    }>(`/api/v1/vendor/orders/${vendorOrderId}/ship`, {
      method: 'POST',
      token: makerToken,
      body: JSON.stringify({ trackingNumber: 'TRK-OPS-1', carrier: 'TCS' }),
    });
    expect(ship.data.vendorOrder.status).toBe('shipped');
    expect(ship.data.vendorOrder.trackingNumber).toBe('TRK-OPS-1');
    expect(ship.data.vendorOrder.carrier).toBe('TCS');

    const otherShip = await api(`/api/v1/vendor/orders/${vendorOrderId}/ship`, {
      method: 'POST',
      token: otherVendorToken,
      body: JSON.stringify({ trackingNumber: 'HACK' }),
    });
    expect(otherShip.status).toBe(404);

    const buyerOrder = await expectOk<{
      data: {
        order: {
          id: string;
          status: string;
          vendorOrders: Array<{
            id: string;
            status: string;
            trackingNumber: string | null;
            carrier: string | null;
          }>;
        };
      };
    }>(`/api/v1/orders/${checkout.orderId}`, { token: buyer.accessToken });
    expect(buyerOrder.data.order.status).toBe('processing');
    const buyerSlice = buyerOrder.data.order.vendorOrders.find((v) => v.id === vendorOrderId);
    expect(buyerSlice?.status).toBe('shipped');
    expect(buyerSlice?.trackingNumber).toBe('TRK-OPS-1');
    expect(buyerSlice?.carrier).toBe('TCS');

    const earnings = await expectOk<{
      data: {
        grossSalesCents: number;
        netCents: number;
        recentTransfers: Array<{ vendorOrderId: string }>;
      };
    }>('/api/v1/vendor/earnings', { token: makerToken });
    expect(earnings.data.grossSalesCents).toBeGreaterThanOrEqual(paidSlice!.itemsSubtotalCents);
    expect(earnings.data.netCents).toBeGreaterThanOrEqual(paidSlice!.vendorNetCents);
    expect(
      earnings.data.recentTransfers.some((t) => t.vendorOrderId === vendorOrderId),
    ).toBe(true);

    const dashAfter = await expectOk<{
      data: { ordersToFulfill: number };
    }>('/api/v1/vendor/dashboard', { token: makerToken });
    expect(dashAfter.data.ordersToFulfill).toBeLessThanOrEqual(
      Math.max(0, dashBefore.data.ordersToFulfill),
    );
    // This order left the to-fulfill set
    expect(dashAfter.data.ordersToFulfill).toBe(dashBefore.data.ordersToFulfill - 1);
  });

  it('allows paid → shipped without fulfill step', async () => {
    const buyer = await registerBuyer();
    const shipName = uniqueId('ops-direct');
    const checkout = await checkoutPaidOrder(buyer.accessToken, makerVariantId, shipName);

    const buyerOrder = await expectOk<{
      data: { order: { vendorOrders: Array<{ id: string; status: string }> } };
    }>(`/api/v1/orders/${checkout.orderId}`, { token: buyer.accessToken });
    const slice = buyerOrder.data.order.vendorOrders.find((v) => v.status === 'paid');
    expect(slice).toBeTruthy();

    const ship = await expectOk<{ data: { vendorOrder: { status: string } } }>(
      `/api/v1/vendor/orders/${slice!.id}/ship`,
      { method: 'POST', token: makerToken, body: '{}' },
    );
    expect(ship.data.vendorOrder.status).toBe('shipped');
  });
});
