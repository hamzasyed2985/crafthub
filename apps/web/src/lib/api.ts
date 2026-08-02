const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: 'customer' | 'vendor' | 'admin';
  status: 'active' | 'banned';
  createdAt: string;
};

export type VendorSummary = {
  id: string;
  displayName: string;
  slug: string;
  status: 'pending' | 'approved' | 'suspended';
  city: string | null;
  bio?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  craftTags?: string[];
  ledgerReviewRequired?: boolean;
};

export type ProductDto = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  category: { id: string; name: string; slug: string } | null;
  shop: {
    id: string;
    flatShippingCents: number;
    shipsFromCity: string | null;
    vendor: {
      id: string;
      displayName: string;
      slug: string;
      city: string | null;
      logoUrl: string | null;
      status: string;
    };
  };
  variants: Array<{
    id: string;
    sku: string | null;
    priceCents: number;
    currency: string;
    stockQty: number;
    attributes: Record<string, string>;
  }>;
  media: Array<{ id: string; url: string; alt: string; sortOrder: number }>;
  createdAt: string;
  updatedAt: string;
};

type AuthResponse = {
  data: {
    user: AuthUser;
    accessToken: string;
  };
};

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    return body.error?.message ?? 'Request failed';
  } catch {
    return 'Request failed';
  }
}

const ACCESS_TOKEN_KEY = 'crafthub_access_token';
const CART_SESSION_KEY = 'crafthub_cart_session';

export type CartDto = {
  id: string;
  itemCount: number;
  currency: string;
  groups: Array<{
    vendor: { id: string; displayName: string; slug: string; city: string | null };
    shop: { id: string; flatShippingCents: number; shipsFromCity: string | null };
    items: Array<{
      id: string;
      quantity: number;
      lineTotalCents: number;
      variant: {
        id: string;
        priceCents: number;
        currency: string;
        stockQty: number;
        sku: string | null;
      };
      product: { id: string; title: string; slug: string; imageUrl: string | null };
    }>;
    subtotalCents: number;
    shippingCents: number;
    vendorTotalCents: number;
  }>;
  itemsSubtotalCents: number;
  shippingTotalCents: number;
  totalCents: number;
  warnings: Array<{ itemId?: string; code: string; message: string }>;
};

export function persistAccessToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
}

export function readAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearAccessToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function persistCartSession(sessionId: string | null | undefined) {
  if (typeof window === 'undefined' || !sessionId) return;
  localStorage.setItem(CART_SESSION_KEY, sessionId);
}

export function readCartSession(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CART_SESSION_KEY);
}

export function clearCartSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CART_SESSION_KEY);
  }
}

function authHeaders(): HeadersInit {
  const token = readAccessToken();
  const cartSession = readCartSession();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cartSession) headers['X-Cart-Session'] = cartSession;
  return headers;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function rememberCartSession(body: { data?: { cartSessionId?: string | null } }) {
  persistCartSession(body.data?.cartSessionId);
}

export async function register(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResponse> {
  const body = await api<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  persistAccessToken(body.data.accessToken);
  return body;
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  const body = await api<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  persistAccessToken(body.data.accessToken);
  return body;
}

export async function fetchMe(): Promise<{ user: AuthUser; vendor: VendorSummary | null }> {
  const body = await api<{ data: { user: AuthUser; vendor: VendorSummary | null } }>(
    '/api/v1/auth/me',
  );
  return body.data;
}

export async function logout() {
  try {
    await api('/api/v1/auth/logout', { method: 'POST' });
  } catch {
    // Still clear local session even if the API call fails
  }
  clearAccessToken();
}

export async function fetchCategories() {
  const body = await api<{ data: Array<{ id: string; name: string; slug: string }> }>(
    '/api/v1/categories',
  );
  return body.data;
}

export async function fetchProducts(params?: Record<string, string>) {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  return api<{ data: ProductDto[]; meta: { total: number; page: number; limit: number } }>(
    `/api/v1/products${qs}`,
  );
}

export async function fetchProduct(id: string) {
  const body = await api<{ data: { product: ProductDto } }>(`/api/v1/products/${id}`);
  return body.data.product;
}

export async function fetchShops(params?: Record<string, string>) {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  return api<{
    data: Array<{
      id: string;
      displayName: string;
      slug: string;
      bio: string | null;
      logoUrl: string | null;
      bannerUrl: string | null;
      city: string | null;
      craftTags: string[];
      flatShippingCents: number;
    }>;
    meta: { total: number; page: number; limit: number };
  }>(`/api/v1/shops${qs}`);
}

export async function fetchShop(slug: string) {
  return api<{
    data: {
      shop: {
        id: string;
        displayName: string;
        slug: string;
        bio: string | null;
        logoUrl: string | null;
        bannerUrl: string | null;
        city: string | null;
        craftTags: string[];
        shippingPolicy: string | null;
        returnsPolicy: string | null;
        flatShippingCents: number;
        shipsFromCity: string | null;
      };
      products: ProductDto[];
    };
  }>(`/api/v1/shops/${slug}`);
}

export async function applyVendor(input: {
  displayName: string;
  slug: string;
  bio?: string;
  city: string;
  craftTags: string[];
  attestation: true;
}) {
  const body = await api<{
    data: { vendor: VendorSummary; accessToken: string; user: AuthUser };
  }>('/api/v1/vendor/apply', { method: 'POST', body: JSON.stringify(input) });
  persistAccessToken(body.data.accessToken);
  return body.data;
}

export async function fetchVendorMe() {
  const body = await api<{ data: { vendor: Record<string, unknown> } }>('/api/v1/vendor/me');
  return body.data.vendor;
}

export async function updateVendorShop(input: Record<string, unknown>) {
  const body = await api<{ data: { vendor: Record<string, unknown> } }>('/api/v1/vendor/shop', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return body.data.vendor;
}

export async function fetchVendorProducts() {
  const body = await api<{ data: ProductDto[] }>('/api/v1/vendor/products');
  return body.data;
}

export async function createVendorProduct(input: unknown) {
  const body = await api<{ data: { product: ProductDto } }>('/api/v1/vendor/products', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return body.data.product;
}

export async function updateVendorProduct(id: string, input: unknown) {
  const body = await api<{ data: { product: ProductDto } }>(`/api/v1/vendor/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return body.data.product;
}

export async function addProductMedia(id: string, input: { url: string; alt?: string }) {
  return api<{ data: { media: { id: string; url: string; alt: string } } }>(
    `/api/v1/vendor/products/${id}/media`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export async function fetchAdminVendors(status?: string) {
  const qs = status ? `?status=${status}` : '';
  return api<{ data: Array<VendorSummary & { user: { email: string; name: string | null } }> }>(
    `/api/v1/admin/vendors${qs}`,
  );
}

export async function patchAdminVendor(
  id: string,
  input: { status: 'pending' | 'approved' | 'suspended'; reason?: string },
) {
  return api<{ data: { vendor: VendorSummary } }>(`/api/v1/admin/vendors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function fetchAdminMetrics() {
  const body = await api<{
    data: {
      gmvCents: number;
      platformRevenueCents: number;
      ordersByStatus: Record<string, number>;
      vendorsByStatus: Record<string, number>;
      refundedOrders: number;
      refundRate: number;
      outstandingVendorDebtCents: number;
      vendorsNeedingLedgerReview: number;
    };
  }>('/api/v1/admin/metrics');
  return body.data;
}

export async function fetchAdminSettings() {
  const body = await api<{
    data: {
      settings: {
        commissionBps: number;
        currency: string;
        debtReviewThresholdCents: number;
        updatedAt: string;
      };
    };
  }>('/api/v1/admin/settings');
  return body.data.settings;
}

export async function patchAdminSettings(input: {
  commissionBps?: number;
  debtReviewThresholdCents?: number;
  currency?: string;
}) {
  const body = await api<{
    data: {
      settings: {
        commissionBps: number;
        currency: string;
        debtReviewThresholdCents: number;
        updatedAt: string;
      };
    };
  }>('/api/v1/admin/settings', { method: 'PATCH', body: JSON.stringify(input) });
  return body.data.settings;
}

export type AdminOrderRow = {
  id: string;
  status: string;
  totalCents: number;
  itemsSubtotalCents: number;
  commissionTotalCents: number;
  currency: string;
  buyer: { id: string; email: string; name: string | null };
  paymentStatus: string | null;
  vendorOrderCount: number;
  createdAt: string;
};

export async function fetchAdminOrders(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const body = await api<{ data: AdminOrderRow[]; meta: { total: number } }>(
    `/api/v1/admin/orders${qs}`,
  );
  return body.data;
}

export async function fetchAdminOrder(id: string) {
  const body = await api<{
    data: {
      order: {
        id: string;
        status: string;
        totalCents: number;
        itemsSubtotalCents: number;
        shippingTotalCents: number;
        commissionTotalCents: number;
        currency: string;
        shipping: {
          name: string;
          line1: string;
          city: string;
          postalCode: string;
          country: string;
        };
        buyer: { id: string; email: string; name: string | null };
        payment: { status: string; amountCents: number; paymentIntentId: string | null } | null;
        vendorOrders: Array<{
          id: string;
          status: string;
          vendor: {
            id: string;
            displayName: string;
            slug: string;
            ledgerReviewRequired: boolean;
          };
          vendorNetCents: number;
          commissionCents: number;
          outstandingDebtCents: number;
          transfer: { status: string; amountCents: number } | null;
          items: Array<{ id: string; title: string; quantity: number; lineTotalCents: number }>;
        }>;
      };
    };
  }>(`/api/v1/admin/orders/${id}`);
  return body.data.order;
}

export async function refundAdminOrder(id: string, reason: string) {
  const body = await api<{
    data: {
      result: { alreadyRefunded: boolean; debtVendorIds?: string[] };
      order: { id: string; status: string };
    };
  }>(`/api/v1/admin/orders/${id}/refund`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return body.data;
}

export async function fetchAdminAuditLogs(action?: string) {
  const qs = action ? `?action=${encodeURIComponent(action)}` : '';
  const body = await api<{
    data: Array<{
      id: string;
      action: string;
      entity: string;
      entityId: string;
      meta: unknown;
      actor: { id: string; email: string; name: string | null } | null;
      createdAt: string;
    }>;
  }>(`/api/v1/admin/audit-logs${qs}`);
  return body.data;
}

export async function fetchCart() {
  const body = await api<{ data: { cart: CartDto; cartSessionId?: string | null } }>(
    '/api/v1/cart',
  );
  rememberCartSession(body);
  return body.data.cart;
}

export async function addCartItem(variantId: string, qty = 1) {
  const body = await api<{ data: { cart: CartDto; cartSessionId?: string | null } }>(
    '/api/v1/cart/items',
    { method: 'POST', body: JSON.stringify({ variantId, qty }) },
  );
  rememberCartSession(body);
  return body.data.cart;
}

export async function updateCartItem(itemId: string, qty: number) {
  const body = await api<{ data: { cart: CartDto; cartSessionId?: string | null } }>(
    `/api/v1/cart/items/${itemId}`,
    { method: 'PATCH', body: JSON.stringify({ qty }) },
  );
  rememberCartSession(body);
  return body.data.cart;
}

export async function removeCartItem(itemId: string) {
  const body = await api<{ data: { cart: CartDto; cartSessionId?: string | null } }>(
    `/api/v1/cart/items/${itemId}`,
    { method: 'DELETE' },
  );
  rememberCartSession(body);
  return body.data.cart;
}

export async function clearCart() {
  const body = await api<{ data: { cart: CartDto; cartSessionId?: string | null } }>(
    '/api/v1/cart',
    { method: 'DELETE' },
  );
  rememberCartSession(body);
  return body.data.cart;
}

export type OrderDto = {
  id: string;
  status: string;
  currency: string;
  itemsSubtotalCents: number;
  shippingTotalCents: number;
  totalCents: number;
  commissionTotalCents: number;
  shipping: {
    name: string;
    line1: string;
    line2: string | null;
    city: string;
    region: string | null;
    postalCode: string;
    country: string;
  };
  payment: {
    status: string;
    amountCents: number;
    checkoutSessionId: string | null;
    paymentIntentId: string | null;
  } | null;
  vendorOrders: Array<{
    id: string;
    status: string;
    vendor: { id: string; displayName: string; slug: string };
    itemsSubtotalCents: number;
    shippingCents: number;
    commissionCents: number;
    vendorNetCents: number;
    trackingNumber?: string | null;
    carrier?: string | null;
    shippedAt?: string | null;
    fulfillingAt?: string | null;
    items: Array<{
      id: string;
      title: string;
      quantity: number;
      unitPriceCents: number;
      lineTotalCents: number;
    }>;
  }>;
  createdAt: string;
};

export async function createCheckoutSession(input: {
  shipping: {
    name: string;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode: string;
    country?: string;
  };
  saveAddress?: boolean;
  idempotencyKey?: string;
}) {
  const headers: HeadersInit = {};
  if (input.idempotencyKey) headers['Idempotency-Key'] = input.idempotencyKey;
  const body = await api<{
    data: {
      orderId: string;
      checkoutUrl: string;
      checkoutSessionId: string;
      order: OrderDto;
    };
  }>('/api/v1/checkout/session', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      shipping: input.shipping,
      saveAddress: input.saveAddress ?? false,
    }),
  });
  return body.data;
}

export async function fetchOrders() {
  const body = await api<{ data: OrderDto[] }>('/api/v1/orders');
  return body.data;
}

export async function fetchOrder(id: string) {
  const body = await api<{ data: { order: OrderDto } }>(`/api/v1/orders/${id}`);
  return body.data.order;
}

/** Ask API to verify Stripe session and mark paid (webhook backup for localhost). */
export async function confirmOrderPayment(id: string) {
  const body = await api<{ data: { order: OrderDto; alreadyPaid: boolean } }>(
    `/api/v1/orders/${id}/confirm-payment`,
    { method: 'POST' },
  );
  return body.data;
}

export async function startVendorStripeOnboard() {
  const body = await api<{
    data: {
      url: string;
      stripe: {
        chargesEnabled: boolean;
        payoutsEnabled: boolean;
        onboardingComplete: boolean;
        hasAccount: boolean;
      };
    };
  }>('/api/v1/vendor/stripe/onboard', { method: 'POST' });
  return body.data;
}

export async function refreshVendorStripe() {
  const body = await api<{
    data: {
      chargesEnabled: boolean;
      payoutsEnabled: boolean;
      onboardingComplete: boolean;
      hasAccount?: boolean;
      mock?: boolean;
    };
  }>('/api/v1/vendor/stripe/refresh', { method: 'POST' });
  return body.data;
}

export async function fetchVendorStripeStatus() {
  const body = await api<{
    data: {
      chargesEnabled: boolean;
      payoutsEnabled: boolean;
      onboardingComplete: boolean;
      hasAccount?: boolean;
      mock?: boolean;
    };
  }>('/api/v1/vendor/stripe/status');
  return body.data;
}

export async function fetchVendorOrders(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const body = await api<{
    data: VendorOrderDto[];
  }>(`/api/v1/vendor/orders${qs}`);
  return body.data;
}

export type VendorOrderDto = {
  id: string;
  status: string;
  vendorNetCents: number;
  commissionCents: number;
  itemsSubtotalCents: number;
  shippingCents: number;
  commissionBps: number;
  trackingNumber: string | null;
  carrier: string | null;
  fulfillingAt: string | null;
  shippedAt: string | null;
  order: {
    id: string;
    status: string;
    shipName: string;
    shipLine1: string;
    shipLine2: string | null;
    shipCity: string;
    shipRegion: string | null;
    shipPostalCode: string;
    shipCountry: string;
    createdAt: string;
  };
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    lineTotalCents: number;
    unitPriceCents: number;
  }>;
  transfer: { status: string; amountCents: number; stripeTransferId: string | null } | null;
};

export async function fetchVendorOrder(id: string) {
  const body = await api<{ data: { vendorOrder: VendorOrderDto } }>(
    `/api/v1/vendor/orders/${id}`,
  );
  return body.data.vendorOrder;
}

export async function fulfillVendorOrder(id: string) {
  const body = await api<{ data: { vendorOrder: VendorOrderDto } }>(
    `/api/v1/vendor/orders/${id}/fulfill`,
    { method: 'POST', body: '{}' },
  );
  return body.data.vendorOrder;
}

export async function shipVendorOrder(
  id: string,
  input?: { trackingNumber?: string; carrier?: string },
) {
  const body = await api<{ data: { vendorOrder: VendorOrderDto } }>(
    `/api/v1/vendor/orders/${id}/ship`,
    { method: 'POST', body: JSON.stringify(input ?? {}) },
  );
  return body.data.vendorOrder;
}

export type VendorEarningsDto = {
  grossSalesCents: number;
  commissionCents: number;
  netCents: number;
  shippingCents: number;
  pendingPayoutCents: number;
  paidOutCents: number;
  last7dNetCents: number;
  last30dNetCents: number;
  outstandingDebtCents?: number;
  recentTransfers: Array<{
    id: string;
    status: string;
    amountCents: number;
    currency: string;
    stripeTransferId: string | null;
    vendorOrderId: string;
    orderId: string;
    vendorOrderStatus: string;
    createdAt: string;
  }>;
};

export async function fetchVendorEarnings() {
  const body = await api<{ data: VendorEarningsDto }>('/api/v1/vendor/earnings');
  return body.data;
}

export type VendorDashboardDto = {
  ordersToFulfill: number;
  net7dCents: number;
  net30dCents: number;
  vendor: Record<string, unknown>;
};

export async function fetchVendorDashboard() {
  const body = await api<{ data: VendorDashboardDto }>('/api/v1/vendor/dashboard');
  return body.data;
}

/** Mock-mode only: simulate checkout.session.completed for an order. */
export async function simulateCheckoutPaid(orderId: string, checkoutSessionId: string) {
  const event = {
    id: `evt_mock_${orderId.replace(/-/g, '').slice(0, 16)}_${Date.now()}`,
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: checkoutSessionId,
        object: 'checkout.session',
        payment_status: 'paid',
        metadata: { orderId },
        client_reference_id: orderId,
        payment_intent: `pi_mock_${orderId.replace(/-/g, '').slice(0, 12)}`,
      },
    },
  };
  const res = await fetch(`${API_URL}/webhooks/stripe/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
