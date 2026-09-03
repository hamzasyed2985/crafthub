'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AccountMenu } from '@/components/account-menu';
import { useCart } from '@/components/cart-provider';
import { IconCart } from '@/components/icons';
import { SITE_SHELL_INNER_CLASS } from '@/lib/site-shell';

const iconBtn =
  'relative inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-background-subtle hover:text-foreground';

export function SiteHeader() {
  const router = useRouter();
  const { cart, openDrawer } = useCart();
  const count = cart?.itemCount ?? 0;

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-elevated/90 backdrop-blur-sm">
      <div className={`relative flex items-center justify-between gap-4 py-3.5 ${SITE_SHELL_INNER_CLASS}`}>
        <Link
          href="/"
          className="relative z-10 shrink-0 font-display text-[1.35rem] font-semibold tracking-[-0.02em]"
        >
          CraftHub
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-5 text-sm text-muted sm:flex">
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

        <nav className="relative z-10 flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <form
            action="/search"
            method="get"
            className="hidden lg:block"
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
              className="min-h-9 w-40 rounded-sm border border-border bg-canvas px-2 text-sm text-foreground xl:w-52"
              aria-label="Search CraftHub"
            />
          </form>

          <button type="button" className={iconBtn} aria-label="Open cart" onClick={openDrawer}>
            <IconCart />
            {count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] font-semibold text-on-accent">
                {count > 99 ? '99+' : count}
              </span>
            ) : null}
          </button>

          <AccountMenu />
        </nav>
      </div>
    </header>
  );
}
