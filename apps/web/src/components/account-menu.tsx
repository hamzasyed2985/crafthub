'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { IconMoon, IconSun, IconUser } from '@/components/icons';

const iconBtn =
  'relative inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-accent-muted';

const menuLink =
  'block rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-accent-muted';

export function AccountMenu() {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user, loading: authLoading, logout } = useAuth();
  const { refresh: refreshCart } = useCart();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const themeSwitchId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const isDark = mounted && (resolvedTheme ?? theme) === 'dark';

  async function onLogout() {
    setLoggingOut(true);
    setOpen(false);
    try {
      await logout();
      await refreshCart().catch(() => undefined);
      router.push('/');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  function close() {
    setOpen(false);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={`${iconBtn}${open ? ' bg-accent-muted' : ''}`}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <IconUser />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[17.5rem] overflow-hidden rounded-lg border border-border bg-elevated shadow-[0_12px_32px_rgba(28,25,23,0.14)]"
        >
          {authLoading ? (
            <p className="px-3.5 py-4 text-sm text-subtle">Loading…</p>
          ) : user ? (
            <>
              <div className="border-b border-border bg-accent-muted/50 px-3.5 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-accent">Signed in</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{user.email}</p>
              </div>
              <div className="space-y-0.5 p-1.5">
                <Link href="/account/orders" role="menuitem" className={menuLink} onClick={close}>
                  Your orders
                </Link>
                <Link href="/account" role="menuitem" className={menuLink} onClick={close}>
                  Account
                </Link>
                {user.role === 'vendor' ? (
                  <Link href="/vendor" role="menuitem" className={menuLink} onClick={close}>
                    Dashboard
                  </Link>
                ) : null}
                {user.role === 'admin' ? (
                  <Link href="/admin" role="menuitem" className={menuLink} onClick={close}>
                    Dashboard
                  </Link>
                ) : null}
                {user.role === 'customer' ? (
                  <Link href="/vendor/apply" role="menuitem" className={menuLink} onClick={close}>
                    Sell on CraftHub
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <div className="space-y-0.5 border-b border-border p-1.5">
              <Link href="/login" role="menuitem" className={menuLink} onClick={close}>
                Log in
              </Link>
              <Link href="/register" role="menuitem" className={menuLink} onClick={close}>
                Join
              </Link>
              <Link
                href="/login?reason=sell&next=/vendor/apply"
                role="menuitem"
                className={menuLink}
                onClick={close}
              >
                Sell on CraftHub
              </Link>
            </div>
          )}

          <div className="border-t border-border px-3.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor={themeSwitchId}
                className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
              >
                {isDark ? <IconMoon className="h-4 w-4 text-accent" /> : <IconSun className="h-4 w-4 text-accent" />}
                <span>Dark mode</span>
              </label>
              <button
                id={themeSwitchId}
                type="button"
                role="switch"
                aria-checked={isDark}
                aria-label="Toggle dark mode"
                disabled={!mounted}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-elevated ${
                  isDark ? 'bg-accent' : 'bg-border-strong'
                }`}
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-elevated shadow-sm transition-transform ${
                    isDark ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {user ? (
            <div className="border-t border-border p-1.5">
              <button
                type="button"
                role="menuitem"
                disabled={loggingOut}
                className="block w-full rounded-md px-2.5 py-2 text-left text-sm text-muted transition-colors hover:bg-accent-muted"
                onClick={() => void onLogout()}
              >
                {loggingOut ? 'Signing out…' : 'Log out'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
