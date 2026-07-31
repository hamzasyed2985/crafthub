const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: 'customer' | 'vendor' | 'admin';
  status: 'active' | 'banned';
  createdAt: string;
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

export async function register(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as AuthResponse;
  persistAccessToken(body.data.accessToken);
  return body;
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as AuthResponse;
  persistAccessToken(body.data.accessToken);
  return body;
}

export async function fetchMe(): Promise<AuthUser> {
  const token = readAccessToken();
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api/v1/auth/me`, {
    credentials: 'include',
    headers,
  });
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { data: { user: AuthUser } };
  return body.data.user;
}
