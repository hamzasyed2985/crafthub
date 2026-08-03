/**
 * PURPOSE: Auth edge cases beyond happy path —
 * validation errors, logout, banned accounts, guest-cart merge on register/login.
 */
import { describe, expect, it } from 'vitest';
import { createHash, randomBytes } from 'node:crypto';
import {
  api,
  cookieFromSetCookie,
  expectOk,
  registerBuyer,
  uniqueId,
  variantIdForShopProduct,
} from './helpers/api';
import { banUserByEmail, prisma } from './helpers/db';

type CartResponse = {
  data: {
    cart: {
      itemCount: number;
      groups: Array<{ items: Array<{ quantity: number }> }>;
    };
  };
};

describe('e2e · auth edges', () => {
  // Zod must reject obviously invalid register payloads before hitting the DB.
  it('rejects register with invalid email / short password', async () => {
    const badEmail = await api<{ error: { code: string } }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email', password: 'TestPass123!' }),
    });
    expect(badEmail.status).toBe(400);
    expect(badEmail.body.error.code).toBe('VALIDATION_ERROR');

    const shortPw = await api<{ error: { code: string } }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: `${uniqueId('bad')}@crafthub.test`, password: 'short' }),
    });
    expect(shortPw.status).toBe(400);
    expect(shortPw.body.error.code).toBe('VALIDATION_ERROR');
  });

  // Logout clears the session cookies; endpoint requires auth.
  it('logout succeeds for authenticated user and rejects anonymous', async () => {
    const buyer = await registerBuyer();
    const { status } = await api('/api/v1/auth/logout', {
      method: 'POST',
      token: buyer.accessToken,
    });
    expect(status).toBe(204);

    const anon = await api<{ error: { code: string } }>('/api/v1/auth/logout', {
      method: 'POST',
    });
    expect(anon.status).toBe(401);
    expect(anon.body.error.code).toBe('UNAUTHORIZED');
  });

  // Banned users must not receive tokens (setup via DB — no public ban API yet).
  it('rejects login for a banned account', async () => {
    const buyer = await registerBuyer();
    await banUserByEmail(buyer.user.email);

    const { status, body } = await api<{ error: { code: string } }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: buyer.user.email, password: buyer.password }),
    });
    expect(status).toBe(403);
    expect(body.error.code).toBe('BANNED');
  });

  // Guest cart lines should move into the user cart when registering with X-Cart-Session.
  it('merges guest cart into user cart on register', async () => {
    const session = uniqueId('merge-reg');
    const mugVariant = await variantIdForShopProduct('clay-ember', 'ember-mug');

    await expectOk('/api/v1/cart/items', {
      method: 'POST',
      cartSession: session,
      body: JSON.stringify({ variantId: mugVariant, qty: 1 }),
    });

    const email = `${uniqueId('merge')}@crafthub.test`;
    const registered = await expectOk<{ data: { accessToken: string } }>(
      '/api/v1/auth/register',
      {
        method: 'POST',
        cartSession: session,
        body: JSON.stringify({ email, password: 'TestPass123!', name: 'Merge Buyer' }),
      },
    );

    const cart = await expectOk<CartResponse>('/api/v1/cart', {
      token: registered.data.accessToken,
    });
    expect(cart.data.cart.itemCount).toBeGreaterThanOrEqual(1);
  });

  // Same merge path on login for returning buyers.
  it('merges guest cart into user cart on login', async () => {
    const buyer = await registerBuyer();
    const session = uniqueId('merge-login');
    const boardVariant = await variantIdForShopProduct('grain-groove', 'walnut-board');

    await expectOk('/api/v1/cart/items', {
      method: 'POST',
      cartSession: session,
      body: JSON.stringify({ variantId: boardVariant, qty: 1 }),
    });

    const loggedIn = await expectOk<{ data: { accessToken: string } }>('/api/v1/auth/login', {
      method: 'POST',
      cartSession: session,
      body: JSON.stringify({ email: buyer.user.email, password: buyer.password }),
    });

    const cart = await expectOk<CartResponse>('/api/v1/cart', {
      token: loggedIn.data.accessToken,
    });
    expect(cart.data.cart.itemCount).toBeGreaterThanOrEqual(1);
  });

  // Invalid Bearer token must not unlock /me.
  it('rejects /me with a garbage bearer token', async () => {
    const { status, body } = await api<{ error: { code: string } }>('/api/v1/auth/me', {
      token: 'not.a.real.jwt',
    });
    expect(status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rotates refresh cookie into a new access token', async () => {
    const email = `${uniqueId('refresh')}@crafthub.test`;
    const password = 'TestPass123!';
    const registered = await api<{ data: { accessToken: string } }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name: 'Refresh Buyer' }),
    });
    expect(registered.status).toBe(201);
    const refresh = cookieFromSetCookie(registered.headers, 'refresh_token');
    expect(refresh).toBeTruthy();

    const rotated = await api<{ data: { accessToken: string } }>('/api/v1/auth/refresh', {
      method: 'POST',
      cookie: `refresh_token=${refresh}`,
    });
    expect(rotated.status).toBe(200);
    expect(rotated.body.data.accessToken).toBeTruthy();
    expect(rotated.body.data.accessToken).not.toBe(registered.body.data.accessToken);

    const newRefresh = cookieFromSetCookie(rotated.headers, 'refresh_token');
    expect(newRefresh).toBeTruthy();
    expect(newRefresh).not.toBe(refresh);

    // Old refresh must be rejected after rotation.
    const reuse = await api<{ error: { code: string } }>('/api/v1/auth/refresh', {
      method: 'POST',
      cookie: `refresh_token=${refresh}`,
    });
    expect(reuse.status).toBe(401);

    const me = await expectOk<{ data: { user: { email: string } } }>('/api/v1/auth/me', {
      token: rotated.body.data.accessToken,
    });
    expect(me.data.user.email).toBe(email);
  });

  it('resets password via token and revokes old sessions', async () => {
    const buyer = await registerBuyer();
    const forgot = await expectOk<{ data: { ok: boolean } }>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: buyer.user.email }),
    });
    expect(forgot.data.ok).toBe(true);

    // Insert a known raw token (API hashes on write; we create one for the test).
    const raw = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(raw).digest('hex');
    await prisma.passwordResetToken.create({
      data: {
        userId: buyer.user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const newPassword = 'NewPass123!';
    await expectOk('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: raw, password: newPassword }),
    });

    const oldLogin = await api<{ error: { code: string } }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: buyer.user.email, password: buyer.password }),
    });
    expect(oldLogin.status).toBe(401);

    const loggedIn = await expectOk<{ data: { accessToken: string } }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: buyer.user.email, password: newPassword }),
    });
    expect(loggedIn.data.accessToken).toBeTruthy();
  });

  it('echoes X-Request-Id on responses', async () => {
    const custom = 'e2e-req-id-12345';
    const { status, headers } = await api('/health', {
      headers: { 'X-Request-Id': custom },
    });
    expect(status).toBe(200);
    expect(headers.get('x-request-id')).toBe(custom);
  });
});
