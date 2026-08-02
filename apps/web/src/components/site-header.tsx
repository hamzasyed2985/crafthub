'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Button } from '@crafthub/ui';
import { useEffect, useState } from 'react';
import { fetchMe, logout, type AuthUser } from '@/lib/api';
import { useCart } from '@/components/cart-provider';

export function SiteHeader() {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { cart, openDrawer, refresh } = useCart();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchMe()
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  const isDark = (resolvedTheme ?? theme) === 'dark';
  const count = cart?.itemCount ?? 0;

  async function onLogout() {
    setLoggingOut(true);
    try {
      await logout();
      setUser(null);
      await refresh().catch(() => undefined);
      router.push('/');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-elevated/90 px-6 py-3.5 backdrop-blur-sm">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-display text-[1.35rem] font-semibold tracking-[-0.02em]">
          CraftHub
        </Link>
        <nav className="hidden items-center gap-4 text-sm text-muted sm:flex">
          <Link href="/explore" className="hover:text-foreground">
            Explore
          </Link>
          <Link href="/shops" className="hover:text-foreground">
            Makers
          </Link>
          <Link href="/search" className="hover:text-foreground">
            Search
          </Link>
        </nav>
      </div>

      <nav className="flex items-center gap-3">
        <form
          action="/search"
          method="get"
          className="hidden md:block"
          onSubmit={(e) => {
            const form = e.currentTarget;
            const input = form.querySelector('input[name="q"]') as HTMLInputElement | null;
            if (!input?.value.trim()) {
              e.preventDefault();
              router.push('/search');
            }
          }}
        >
          <input
            name="q"
            type="search"
            placeholder="Search…"
            className="min-h-9 w-40 rounded-sm border border-border bg-canvas px-2 text-sm text-foreground lg:w-52"
            aria-label="Search CraftHub"
          />
        </form>
        <Button variant="ghost" size="sm" aria-label="Open cart" onClick={openDrawer}>
          Cart{count > 0 ? ` (${count})` : ''}
        </Button>
        {user?.role === 'vendor' ? (
          <Link href="/vendor" className="text-sm text-muted hover:text-foreground">
            Dashboard
          </Link>
        ) : user?.role !== 'admin' ? (
          <Link href="/vendor/apply" className="text-sm text-muted hover:text-foreground">
            Sell
          </Link>
        ) : null}
        {user?.role === 'admin' ? (
          <Link href="/admin" className="text-sm text-muted hover:text-foreground">
            Admin
          </Link>
        ) : null}
        {user ? (
          <>
            <Link href="/account" className="text-sm text-muted hover:text-foreground">
              Account
            </Link>
            <Button
              variant="ghost"
              size="sm"
              disabled={loggingOut}
              onClick={() => void onLogout()}
            >
              {loggingOut ? '…' : 'Log out'}
            </Button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-[0.95rem] text-muted">
              Log in
            </Link>
            <Link href="/register">
              <Button size="sm">Join</Button>
            </Link>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          aria-label="Toggle color theme"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
          {mounted ? (isDark ? 'Light' : 'Dark') : 'Theme'}
        </Button>
      </nav>
    </header>
  );
}
