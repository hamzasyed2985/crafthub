import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { env } from '../env.js';
import { AppError } from './errors.js';

export type CheckoutSessionCreateParams = {
  orderId: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  lineItems: Array<{ name: string; amountCents: number; quantity: number }>;
};

export type StripeAdapter = {
  mode: 'live' | 'mock';
  createExpressAccount: (opts: { email: string; businessName: string }) => Promise<{ id: string }>;
  createAccountLink: (opts: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
    type: 'account_onboarding' | 'account_update';
  }) => Promise<{ url: string }>;
  createExpressLoginLink: (accountId: string) => Promise<{ url: string }>;
  retrieveAccount: (accountId: string) => Promise<{
    id: string;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
  }>;
  createCheckoutSession: (params: CheckoutSessionCreateParams) => Promise<{
    id: string;
    url: string;
    payment_intent: string | null;
  }>;
  retrieveCheckoutSession: (sessionId: string) => Promise<{
    id: string;
    payment_status: string | null;
    payment_intent: string | null;
    metadata: Record<string, string> | null;
    client_reference_id: string | null;
  }>;
  createTransfer: (opts: {
    amountCents: number;
    currency: string;
    destination: string;
    transferGroup: string;
    idempotencyKey: string;
  }) => Promise<{ id: string }>;
  createRefund: (opts: {
    paymentIntentId: string;
    amountCents?: number;
    idempotencyKey: string;
    reason?: string;
  }) => Promise<{ id: string; status: string }>;
  constructWebhookEvent: (rawBody: Buffer, signature: string | undefined) => Stripe.Event;
};

function createMockAdapter(): StripeAdapter {
  return {
    mode: 'mock',
    async createExpressAccount() {
      return { id: `acct_mock_${randomUUID().replace(/-/g, '').slice(0, 16)}` };
    },
    async createAccountLink(opts) {
      const q = opts.type === 'account_update' ? 'mock_update=1' : 'mock_onboard=1';
      return {
        url: `${opts.returnUrl}${opts.returnUrl.includes('?') ? '&' : '?'}${q}&account=${opts.accountId}`,
      };
    },
    async createExpressLoginLink(accountId) {
      return {
        url: `${env.APP_URL}/vendor/onboarding?mock_dashboard=1&account=${accountId}`,
      };
    },
    async retrieveAccount(accountId) {
      return {
        id: accountId,
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      };
    },
    async createCheckoutSession(params) {
      const id = `cs_mock_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
      const pi = `pi_mock_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
      return {
        id,
        url: `${env.APP_URL}/checkout/success?orderId=${params.orderId}&mock_session=${id}`,
        payment_intent: pi,
      };
    },
    async retrieveCheckoutSession(sessionId) {
      return {
        id: sessionId,
        payment_status: 'paid',
        payment_intent: `pi_mock_retrieved`,
        metadata: null,
        client_reference_id: null,
      };
    },
    async createTransfer(opts) {
      return {
        id: `tr_mock_${opts.idempotencyKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`,
      };
    },
    async createRefund(opts) {
      return {
        id: `re_mock_${opts.idempotencyKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`,
        status: 'succeeded',
      };
    },
    constructWebhookEvent(rawBody, _signature) {
      const parsed = JSON.parse(rawBody.toString('utf8')) as Stripe.Event;
      if (!parsed.id || !parsed.type) {
        throw new AppError(400, 'INVALID_WEBHOOK', 'Mock webhook payload missing id/type');
      }
      return parsed;
    },
  };
}

function createLiveAdapter(): StripeAdapter {
  if (env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
    throw new AppError(
      503,
      'STRIPE_LIVE_BLOCKED',
      'Live Stripe keys are blocked. Use sk_test_… keys for sandbox only.',
    );
  }
  if (!env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    throw new AppError(
      503,
      'STRIPE_NOT_CONFIGURED',
      'Expected a Stripe test secret key (sk_test_…).',
    );
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  return {
    mode: 'live',
    async createExpressAccount(opts) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: opts.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: { name: opts.businessName },
      });
      return { id: account.id };
    },
    async createAccountLink(opts) {
      const link = await stripe.accountLinks.create({
        account: opts.accountId,
        refresh_url: opts.refreshUrl,
        return_url: opts.returnUrl,
        type: opts.type,
      });
      return { url: link.url };
    },
    async createExpressLoginLink(accountId) {
      const link = await stripe.accounts.createLoginLink(accountId);
      return { url: link.url };
    },
    async retrieveAccount(accountId) {
      const account = await stripe.accounts.retrieve(accountId);
      return {
        id: account.id,
        charges_enabled: Boolean(account.charges_enabled),
        payouts_enabled: Boolean(account.payouts_enabled),
        details_submitted: Boolean(account.details_submitted),
      };
    },
    async createCheckoutSession(params) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: params.customerEmail,
        client_reference_id: params.orderId,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        line_items: params.lineItems.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: params.currency.toLowerCase(),
            unit_amount: item.amountCents,
            product_data: { name: item.name },
          },
        })),
        payment_intent_data: {
          transfer_group: params.orderId,
          metadata: { orderId: params.orderId },
        },
        metadata: { orderId: params.orderId },
      });
      if (!session.url) {
        throw new AppError(502, 'STRIPE_ERROR', 'Checkout session missing URL');
      }
      const pi =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? null);
      return { id: session.id, url: session.url, payment_intent: pi };
    },
    async retrieveCheckoutSession(sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const pi =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? null);
      return {
        id: session.id,
        payment_status: session.payment_status,
        payment_intent: pi,
        metadata: (session.metadata as Record<string, string> | null) ?? null,
        client_reference_id: session.client_reference_id,
      };
    },
    async createTransfer(opts) {
      const transfer = await stripe.transfers.create(
        {
          amount: opts.amountCents,
          currency: opts.currency.toLowerCase(),
          destination: opts.destination,
          transfer_group: opts.transferGroup,
        },
        { idempotencyKey: opts.idempotencyKey },
      );
      return { id: transfer.id };
    },
    async createRefund(opts) {
      const refund = await stripe.refunds.create(
        {
          payment_intent: opts.paymentIntentId,
          amount: opts.amountCents,
          reason: 'requested_by_customer',
          metadata: { reason: opts.reason ?? '' },
        },
        { idempotencyKey: opts.idempotencyKey },
      );
      return { id: refund.id, status: refund.status ?? 'succeeded' };
    },
    constructWebhookEvent(rawBody, signature) {
      if (!env.STRIPE_WEBHOOK_SECRET) {
        throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'STRIPE_WEBHOOK_SECRET is not set');
      }
      if (!signature) {
        throw new AppError(400, 'INVALID_WEBHOOK', 'Missing Stripe-Signature header');
      }
      return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    },
  };
}

let cached: StripeAdapter | null = null;

export function getStripe(): StripeAdapter {
  if (cached) return cached;
  cached = env.useStripeMock ? createMockAdapter() : createLiveAdapter();
  return cached;
}

export function isStripeMockMode() {
  return env.useStripeMock;
}

/** Mock/seed IDs are not real Stripe Connect accounts — replace when using test/live API. */
export function isPlaceholderConnectAccountId(accountId: string | null | undefined): boolean {
  if (!accountId) return false;
  return accountId.startsWith('acct_mock_') || accountId.startsWith('acct_seed_');
}

/** True when onboard should create (or recreate) a Connect account row in Stripe. */
export function shouldCreateConnectAccount(
  accountId: string | null | undefined,
  mockMode: boolean,
): boolean {
  if (!accountId) return true;
  if (mockMode) return false;
  return isPlaceholderConnectAccountId(accountId);
}
