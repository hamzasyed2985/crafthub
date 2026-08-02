/**
 * PURPOSE: Phase 5 admin finance — metrics, settings, full refunds, and
 * Amazon-style vendor debt ledger (net against future payouts).
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
    checkoutSessionId: string;
  };
};

async function enableVendorStripe(email: string, password: string) {
  const session = await login(email, password);
  await expectOk('/api/v1/vendor/stripe/onboard', {
    method: 'POST',
    token: session.data.accessToken,
  });
  return session.data.accessToken;
}

async function postMockPaidWebhook(orderId: string, checkoutSessionId: string) {
  const id = `evt_fin_${randomUUID().replace(/-/g, '').slice(0, 18)}`;
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
          payment_intent: `pi_fin_${id.slice(-12)}`,
        },
      },
    }),
  });
}

async function checkoutAndPay(buyerToken: string, variantId: string, shipName: string) {
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
        line1: '1 Admin St',
        city: 'Karachi',
        postalCode: '74000',
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

describe('e2e · admin finance (phase 5)', () => {
  let adminToken: string;
  let potteryToken: string;
  let mugVariantId: string;
  let potteryVendorId: string;

  beforeAll(async () => {
    const admin = await login(SEED.admin.email, SEED.admin.password);
    adminToken = admin.data.accessToken;
    potteryToken = await enableVendorStripe(SEED.pottery.email, SEED.pottery.password);
    mugVariantId = await variantIdForShopProduct(SEED.pottery.shopSlug, 'ember-mug');

    const me = await expectOk<{ data: { vendor: { id: string } } }>('/api/v1/vendor/me', {
      token: potteryToken,
    });
    potteryVendorId = me.data.vendor.id;
  });

  it('patches commission settings and returns metrics', async () => {
    const settings = await expectOk<{
      data: { settings: { commissionBps: number; debtReviewThresholdCents: number } };
    }>('/api/v1/admin/settings', { token: adminToken });

    const patched = await expectOk<{
      data: { settings: { commissionBps: number } };
    }>('/api/v1/admin/settings', {
      method: 'PATCH',
      token: adminToken,
      body: JSON.stringify({
        commissionBps: settings.data.settings.commissionBps,
        debtReviewThresholdCents: 1,
      }),
    });
    expect(patched.data.settings.commissionBps).toBe(settings.data.settings.commissionBps);

    const metrics = await expectOk<{
      data: { gmvCents: number; platformRevenueCents: number };
    }>('/api/v1/admin/metrics', { token: adminToken });
    expect(metrics.data.gmvCents).toBeGreaterThanOrEqual(0);
  });

  it('refunds a paid order, records debt, and nets next payout', async () => {
    const buyer1 = await registerBuyer();
    const first = await checkoutAndPay(
      buyer1.accessToken,
      mugVariantId,
      uniqueId('fin-buyer-1'),
    );

    const orderBefore = await expectOk<{
      data: {
        order: {
          status: string;
          vendorOrders: Array<{
            id: string;
            vendorNetCents: number;
            transfer: { status: string; amountCents: number } | null;
          }>;
        };
      };
    }>(`/api/v1/orders/${first.orderId}`, { token: buyer1.accessToken });
    expect(orderBefore.data.order.status).toBe('paid');
    const slice = orderBefore.data.order.vendorOrders[0];
    expect(slice?.transfer?.status).toBe('paid');
    expect(slice!.transfer!.amountCents).toBeGreaterThan(0);
    const paidOutCents = slice!.transfer!.amountCents;

    const refund = await expectOk<{
      data: {
        result: { alreadyRefunded: boolean; debtVendorIds: string[] };
        order: { status: string };
      };
    }>(`/api/v1/admin/orders/${first.orderId}/refund`, {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({ reason: 'E2E full refund after payout' }),
    });
    expect(refund.data.order.status).toBe('refunded');
    expect(refund.data.result.debtVendorIds).toContain(potteryVendorId);

    const ledger = await expectOk<{
      data: {
        outstandingDebtCents: number;
        ledgerReviewRequired: boolean;
        entries: Array<{ kind: string; amountCents: number }>;
      };
    }>(`/api/v1/admin/vendors/${potteryVendorId}/ledger`, { token: adminToken });
    expect(ledger.data.outstandingDebtCents).toBeGreaterThanOrEqual(paidOutCents);
    expect(ledger.data.entries.some((e) => e.kind === 'refund_debt')).toBe(true);
    // threshold set to 1 in prior test (or default); debt should flag review
    expect(ledger.data.ledgerReviewRequired).toBe(true);

    const debtBeforeSecond = ledger.data.outstandingDebtCents;

    const buyer2 = await registerBuyer();
    const second = await checkoutAndPay(
      buyer2.accessToken,
      mugVariantId,
      uniqueId('fin-buyer-2'),
    );

    const order2 = await expectOk<{
      data: {
        order: {
          vendorOrders: Array<{
            vendorNetCents: number;
            transfer: { status: string; amountCents: number } | null;
          }>;
        };
      };
    }>(`/api/v1/orders/${second.orderId}`, { token: buyer2.accessToken });
    const slice2 = order2.data.order.vendorOrders[0];
    expect(slice2?.transfer?.status).toBe('paid');
    // Transfer should be reduced by outstanding debt (netting)
    expect(slice2!.transfer!.amountCents).toBeLessThan(slice2!.vendorNetCents);
    expect(slice2!.transfer!.amountCents).toBe(
      Math.max(0, slice2!.vendorNetCents - Math.min(debtBeforeSecond, slice2!.vendorNetCents)),
    );

    const ledgerAfter = await expectOk<{
      data: { outstandingDebtCents: number; entries: Array<{ kind: string }> };
    }>(`/api/v1/admin/vendors/${potteryVendorId}/ledger`, { token: adminToken });
    expect(ledgerAfter.data.outstandingDebtCents).toBeLessThan(debtBeforeSecond);
    expect(ledgerAfter.data.entries.some((e) => e.kind === 'debt_offset')).toBe(true);

    const earnings = await expectOk<{
      data: { outstandingDebtCents: number };
    }>('/api/v1/vendor/earnings', { token: potteryToken });
    expect(earnings.data.outstandingDebtCents).toBe(ledgerAfter.data.outstandingDebtCents);

    const audit = await expectOk<{ data: Array<{ action: string }> }>(
      '/api/v1/admin/audit-logs?action=refund',
      { token: adminToken },
    );
    expect(audit.data.some((a) => a.action === 'order.refund')).toBe(true);
  });

  it('forbids non-admin from refunding', async () => {
    const denied = await api('/api/v1/admin/orders/' + randomUUID() + '/refund', {
      method: 'POST',
      token: potteryToken,
      body: JSON.stringify({ reason: 'nope' }),
    });
    expect(denied.status).toBe(403);
  });
});
