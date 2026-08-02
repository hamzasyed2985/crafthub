'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearAccessToken,
  fetchMe,
  logout as apiLogout,
  readAccessToken,
  type AuthUser,
  type VendorSummary,
} from '@/lib/api';

type AuthContextValue = {
  user: AuthUser | null;
  vendor: VendorSummary | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [vendor, setVendor] = useState<VendorSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!readAccessToken()) {
      setUser(null);
      setVendor(null);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchMe();
      setUser(data.user);
      setVendor(data.vendor);
    } catch {
      // api() redirects on 401; clear local auth state if still here
      clearAccessToken();
      setUser(null);
      setVendor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setVendor(null);
  }, []);

  const value = useMemo(
    () => ({ user, vendor, loading, refresh, logout }),
    [user, vendor, loading, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
