/**
 * PURPOSE: Phase 6 trust & polish — search, reviews after ship, email outbox.
 */
import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { prisma } from './helpers/db';
import {
  api,
  expectOk,
  login,
  registerBuyer,
  SEED,
  uniqueId,
  variantIdForShopProduct,
} from './helpers/api';

async function enableVendorStripe(email: string, password: string) {
  const session = await login(email, password);
  await expectOk('/api/v1/vendor/stripe/onboard', {
    method: 'POST',
    token: session.data.accessToken,
  });
  return session.data.accessToken;
}

async function postMockPaid(orderId: string, checkoutSessionId: string) {
  const id = `evt_p6_${randomUUID().replace(/-/g, '').slice(0, 18)}`;
  return api('/webhooks/stripe/test', {
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
          payment_intent: `pi_p6_${id.slice(-12)}`,
        },
      },
    }),
  });
}

describe('e2e · trust & polish (phase 6)', () => {
  let potteryToken: string;
  let mugVariantId: string;
  let mugProductId: string;

  beforeAll(async () => {
    potteryToken = await enableVendorStripe(SEED.pottery.email, SEED.pottery.password);
    mugVariantId = await variantIdForShopProduct(SEED.pottery.shopSlug, 'ember-mug');
    const shop = await expectOk<{
      data: { products: Array<{ id: string; slug: string }> };
    }>(`/api/v1/shops/${SEED.pottery.shopSlug}`);
    const mug = shop.data.products.find((p) => p.slug === 'ember-mug');
    if (!mug) throw new Error('ember-mug missing');
    mugProductId = mug.id;
  });

  it('searches products and shops', async () => {
    const res = await expectOk<{
      data: { products: Array<{ title: string }>; shops: Array<{ slug: string }> };
      meta: { totalProducts: number; q: string };
    }>('/api/v1/search?q=mug');
    expect(res.meta.q).toBe('mug');
    expect(res.data.products.length).toBeGreaterThan(0);
    expect(res.data.products.some((p) => /mug/i.test(p.title))).toBe(true);

    const shops = await expectOk<{
      data: { shops: Array<{ slug: string }> };
    }>('/api/v1/search?q=clay');
    expect(shops.data.shops.some((s) => s.slug === SEED.pottery.shopSlug)).toBe(true);
  });

  it('allows verified review after ship and writes email outbox', async () => {
    const buyer = await registerBuyer({ name: 'Reviewer' });
    await expectOk('/api/v1/cart/items', {
      method: 'POST',
      token: buyer.accessToken,
      body: JSON.stringify({ variantId: mugVariantId, qty: 1 }),
    });
    const checkout = await expectOk<{
      data: { orderId: string; checkoutSessionId: string };
    }>('/api/v1/checkout/session', {
      method: 'POST',
      token: buyer.accessToken,
      body: JSON.stringify({
        shipping: {
          name: uniqueId('p6'),
          line1: '9 Review Ln',
          city: 'Islamabad',
          postalCode: '44000',
          country: 'PK',
        },
      }),
    });
    const wh = await postMockPaid(checkout.data.orderId, checkout.data.checkoutSessionId);
    expect(wh.status).toBe(200);

    const paidEmails = await prisma.emailOutbox.findMany({
      where: { template: 'order.paid', toEmail: buyer.user.email },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(paidEmails.length).toBe(1);

    const order = await expectOk<{
      data: { order: { vendorOrders: Array<{ id: string }> } };
    }>(`/api/v1/orders/${checkout.data.orderId}`, { token: buyer.accessToken });
    const voId = order.data.order.vendorOrders[0]!.id;

    const early = await api(`/api/v1/products/${mugProductId}/reviews`, {
      method: 'POST',
      token: buyer.accessToken,
      body: JSON.stringify({ rating: 5, body: 'too early' }),
    });
    expect(early.status).toBe(403);

    await expectOk(`/api/v1/vendor/orders/${voId}/ship`, {
      method: 'POST',
      token: potteryToken,
      body: JSON.stringify({ trackingNumber: 'P6-TRACK', carrier: 'TCS' }),
    });

    const shippedEmails = await prisma.emailOutbox.findMany({
      where: { template: 'order.shipped', toEmail: buyer.user.email },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(shippedEmails.length).toBe(1);

    const review = await expectOk<{ data: { review: { rating: number; verifiedPurchase: boolean } } }>(
      `/api/v1/products/${mugProductId}/reviews`,
      {
        method: 'POST',
        token: buyer.accessToken,
        body: JSON.stringify({ rating: 5, body: 'Beautiful glaze.' }),
      },
    );
    expect(review.data.review.rating).toBe(5);
    expect(review.data.review.verifiedPurchase).toBe(true);

    const listed = await expectOk<{
      data: Array<{ body: string }>;
      meta: { averageRating: number | null };
    }>(`/api/v1/products/${mugProductId}/reviews`);
    expect(listed.data.some((r) => r.body.includes('Beautiful'))).toBe(true);
    expect(listed.meta.averageRating).toBeGreaterThan(0);

    const dup = await api(`/api/v1/products/${mugProductId}/reviews`, {
      method: 'POST',
      token: buyer.accessToken,
      body: JSON.stringify({ rating: 4, body: 'again' }),
    });
    expect(dup.status).toBe(409);
  });
});
