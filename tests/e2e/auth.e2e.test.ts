/**
 * PURPOSE: Cover Phase 0 auth flows — register, login, /me, and rejection paths.
 * Ensures JWT issuance works and banned/wrong credentials fail safely.
 */
import { describe, expect, it } from 'vitest';
import { api, login, registerBuyer, uniqueId } from './helpers/api';

describe('e2e · auth', () => {
  // Happy path: new customer can register and receive an access token.
  it('registers a customer and returns accessToken', async () => {
    const email = `${uniqueId('auth')}@crafthub.test`;
    const { status, body } = await api<{
      data: { user: { email: string; role: string }; accessToken: string };
    }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: 'TestPass123!',
        name: 'Auth Tester',
      }),
    });

    expect(status).toBe(201);
    expect(body.data.user.email).toBe(email);
    expect(body.data.user.role).toBe('customer');
    expect(body.data.accessToken.length).toBeGreaterThan(20);
  });

  // Duplicate email must not create a second account.
  it('rejects duplicate email registration', async () => {
    const { user } = await registerBuyer();
    const { status, body } = await api<{ error: { code: string } }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: user.email,
        password: 'TestPass123!',
      }),
    });
    expect(status).toBe(409);
    expect(body.error.code).toBe('EMAIL_TAKEN');
  });

  // Login must return a usable token for the same user.
  it('logs in and /me returns the current user', async () => {
    const registered = await registerBuyer();
    const loggedIn = await login(registered.user.email, registered.password);

    expect(loggedIn.data.accessToken).toBeTruthy();

    const me = await api<{ data: { user: { email: string }; vendor: unknown } }>(
      '/api/v1/auth/me',
      { token: loggedIn.data.accessToken },
    );
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(registered.user.email);
    expect(me.body.data.vendor).toBeNull();
  });

  // Wrong password must not leak whether the email exists beyond a generic failure.
  it('rejects invalid login credentials', async () => {
    const registered = await registerBuyer();
    const { status, body } = await api<{ error: { code: string } }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: registered.user.email,
        password: 'WrongPassword!!',
      }),
    });
    expect(status).toBe(401);
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  // Protected routes require a valid Bearer token.
  it('rejects /me without authentication', async () => {
    const { status, body } = await api<{ error: { code: string } }>('/api/v1/auth/me');
    expect(status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});
