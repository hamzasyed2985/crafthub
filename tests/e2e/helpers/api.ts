/**
 * Shared helpers for CraftHub e2e API tests.
 *
 * These hit the real HTTP API (default http://localhost:4000).
 * Prerequisites: Docker (Postgres/Redis) running, `pnpm db:seed`, `pnpm dev:api`.
 */

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';

export type ApiErrorBody = {
  error: { code: string; message: string; details?: unknown };
};

/** Unique suffix so parallel/local re-runs do not collide on emails/slugs. */
export function uniqueId(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function api<T>(
  path: string,
  init: RequestInit & { token?: string; cartSession?: string; cookie?: string } = {},
): Promise<{ status: number; body: T; headers: Headers }> {
  const { token, cartSession, cookie, headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders);
  if (!headers.has('Content-Type') && rest.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (cartSession) headers.set('X-Cart-Session', cartSession);
  if (cookie) headers.set('Cookie', cookie);

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
  });

  const text = await res.text();
  let body = undefined as T;
  if (text) {
    try {
      body = JSON.parse(text) as T;
    } catch {
      body = text as unknown as T;
    }
  }

  return { status: res.status, body, headers: res.headers };
}

/** Extract a named cookie value from Set-Cookie response headers. */
export function cookieFromSetCookie(headers: Headers, name: string): string | null {
  const list =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : [headers.get('set-cookie')].filter((v): v is string => Boolean(v));
  for (const raw of list) {
    for (const part of raw.split(/,(?=\s*[^;=]+=)/)) {
      const pair = part.trim().split(';')[0] ?? '';
      const eq = pair.indexOf('=');
      if (eq <= 0) continue;
      if (pair.slice(0, eq) === name) return pair.slice(eq + 1);
    }
  }
  return null;
}

export async function expectOk<T>(
  path: string,
  init?: RequestInit & { token?: string; cartSession?: string },
): Promise<T> {
  const { status, body } = await api<T>(path, init);
  if (status < 200 || status >= 300) {
    throw new Error(
      `Expected 2xx for ${path}, got ${status}: ${JSON.stringify(body)}`,
    );
  }
  return body;
}

/** Register a fresh buyer and return access token + user. */
export async function registerBuyer(overrides?: {
  email?: string;
  password?: string;
  name?: string;
}) {
  const email = overrides?.email ?? `${uniqueId('buyer')}@crafthub.test`;
  const password = overrides?.password ?? 'TestPass123!';
  const body = await expectOk<{
    data: { user: { id: string; email: string; role: string }; accessToken: string };
  }>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      name: overrides?.name ?? 'E2E Buyer',
    }),
  });
  return { ...body.data, password };
}

/** Log in with email/password and return tokens. */
export async function login(email: string, password: string) {
  return expectOk<{
    data: { user: { id: string; email: string; role: string }; accessToken: string };
  }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/** Seeded admin credentials from packages/db/prisma/seed.ts */
export const SEED = {
  admin: { email: 'admin@crafthub.local', password: 'Admin123!' },
  pottery: { email: 'pottery@crafthub.local', password: 'Vendor123!', shopSlug: 'clay-ember' },
  wood: { email: 'wood@crafthub.local', password: 'Vendor123!', shopSlug: 'grain-groove' },
} as const;

export type VendorApplyResult = {
  vendor: { id: string; slug: string; status: string };
  accessToken: string;
  user: { id: string; role: string };
};

/** Customer applies as vendor; returns pending vendor + refreshed token. */
export async function applyAsVendor(
  token: string,
  overrides?: { slug?: string; displayName?: string },
) {
  const slug = overrides?.slug ?? uniqueId('shop');
  const body = await expectOk<{ data: VendorApplyResult }>('/api/v1/vendor/apply', {
    method: 'POST',
    token,
    body: JSON.stringify({
      displayName: overrides?.displayName ?? `E2E Shop ${slug}`,
      slug,
      city: 'Islamabad',
      bio: 'Handmade e2e crafts.',
      craftTags: ['pottery'],
      attestation: true,
    }),
  });
  return { ...body.data, slug };
}

/** Admin sets vendor status (approved / suspended). */
export async function adminSetVendorStatus(
  vendorId: string,
  status: 'approved' | 'suspended' | 'pending',
  reason = 'e2e',
) {
  const admin = await login(SEED.admin.email, SEED.admin.password);
  return expectOk<{ data: { vendor: { id: string; status: string; slug: string } } }>(
    `/api/v1/admin/vendors/${vendorId}`,
    {
      method: 'PATCH',
      token: admin.data.accessToken,
      body: JSON.stringify({ status, reason }),
    },
  );
}

/** Full path: register → apply → admin approve. Returns approved vendor token + slug. */
export async function createApprovedVendor() {
  const buyer = await registerBuyer();
  const applied = await applyAsVendor(buyer.accessToken);
  await adminSetVendorStatus(applied.vendor.id, 'approved');
  // Token from apply still works for identity; re-login to be safe after role change.
  const session = await login(buyer.user.email, buyer.password);
  return {
    email: buyer.user.email,
    password: buyer.password,
    accessToken: session.data.accessToken,
    vendorId: applied.vendor.id,
    slug: applied.slug,
  };
}

export type ProductPayload = {
  id: string;
  title: string;
  slug: string;
  status: string;
  variants: Array<{ id: string; stockQty: number; priceCents: number }>;
};

/** Create a product for an approved vendor. */
export async function createVendorProduct(
  token: string,
  opts: {
    title?: string;
    slug?: string;
    status?: 'draft' | 'active' | 'archived';
    stockQty?: number;
    priceCents?: number;
    categoryId?: string;
  } = {},
) {
  const slug = opts.slug ?? uniqueId('prod');
  const body = await expectOk<{ data: { product: ProductPayload } }>('/api/v1/vendor/products', {
    method: 'POST',
    token,
    body: JSON.stringify({
      title: opts.title ?? `E2E Product ${slug}`,
      slug,
      description: 'Created by e2e edge suite',
      status: opts.status ?? 'draft',
      categoryId: opts.categoryId,
      variants: [
        {
          sku: `SKU-${slug}`,
          priceCents: opts.priceCents ?? 1200,
          currency: 'USD',
          stockQty: opts.stockQty ?? 5,
          attributes: {},
        },
      ],
    }),
  });
  return body.data.product;
}

/** Resolve first variant id for a seeded public shop product. */
export async function variantIdForShopProduct(shopSlug: string, productSlug: string) {
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
