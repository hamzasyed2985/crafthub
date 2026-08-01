'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Button } from '@crafthub/ui';
import { useEffect, useState } from 'react';
import { fetchMe, type AuthUser } from '@/lib/api';
import { useCart } from '@/components/cart-provider';

export function SiteHeader() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { cart, openDrawer } = useCart();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchMe()
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  const isDark = (resolvedTheme ?? theme) === 'dark';
  const count = cart?.itemCount ?? 0;

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
        </nav>
      </div>

      <nav className="flex items-center gap-3">
        <Button variant="ghost" size="sm" aria-label="Open cart" onClick={openDrawer}>
          Cart{count > 0 ? ` (${count})` : ''}
        </Button>
        {user?.role === 'vendor' ? (
          <Link href="/vendor" className="text-sm text-muted hover:text-foreground">
            Dashboard
          </Link>
        ) : (
          <Link href="/vendor/apply" className="text-sm text-muted hover:text-foreground">
            Sell
          </Link>
        )}
        {user?.role === 'admin' ? (
          <Link href="/admin/vendors" className="text-sm text-muted hover:text-foreground">
            Admin
          </Link>
        ) : null}
        {user ? (
          <Link href="/account" className="text-sm text-muted hover:text-foreground">
            Account
          </Link>
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
