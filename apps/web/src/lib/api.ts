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

function authHeaders(): HeadersInit {
  const token = readAccessToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
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
