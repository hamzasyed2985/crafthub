'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

const APPROVED_JUMP = [
  { href: '/vendor', label: 'Dashboard' },
  { href: '/vendor/orders', label: 'Orders' },
  { href: '/vendor/products', label: 'Products' },
  { href: '/vendor/earnings', label: 'Earnings' },
  { href: '/vendor/shop', label: 'Shop' },
] as const;

const PENDING_JUMP = [
  { href: '/vendor/onboarding', label: 'Onboarding' },
  { href: '/vendor/shop', label: 'Shop' },
] as const;

function detailLabel(pathname: string): string | null {
  if (/^\/vendor\/orders\/[^/]+$/.test(pathname)) return 'Order detail';
  if (pathname === '/vendor/products/new') return 'New product';
  if (/^\/vendor\/products\/[^/]+$/.test(pathname)) return 'Edit product';
  return null;
}

function sectionLabel(pathname: string, approved: boolean): { href: string; label: string } {
  if (pathname.startsWith('/vendor/orders')) return { href: '/vendor/orders', label: 'Orders' };
  if (pathname.startsWith('/vendor/products')) return { href: '/vendor/products', label: 'Products' };
  if (pathname.startsWith('/vendor/earnings')) return { href: '/vendor/earnings', label: 'Earnings' };
  if (pathname.startsWith('/vendor/shop')) return { href: '/vendor/shop', label: 'Shop' };
  if (pathname.startsWith('/vendor/onboarding')) {
    return { href: '/vendor/onboarding', label: 'Onboarding' };
  }
  if (pathname.startsWith('/vendor/apply')) return { href: '/vendor/apply', label: 'Apply' };
  return approved
    ? { href: '/vendor', label: 'Dashboard' }
    : { href: '/vendor/onboarding', label: 'Onboarding' };
}

export function SellerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { vendor } = useAuth();
  const approved = vendor?.status === 'approved';
  const homeHref = approved ? '/vendor' : '/vendor/onboarding';
  const jump = approved ? APPROVED_JUMP : PENDING_JUMP;
  const section = sectionLabel(pathname, approved);
  const detail = detailLabel(pathname);
  const onHome = pathname === homeHref;

  return (
    <div className="border-b border-border bg-elevated/60">
      <nav
        aria-label="Seller breadcrumb"
        className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-6 py-3 text-sm"
      >
        <Link href={homeHref} className="font-semibold text-foreground hover:text-accent">
          Seller
        </Link>

        {!onHome || detail ? (
          <>
            <span className="text-subtle" aria-hidden>
              /
            </span>
            {detail ? (
              <>
                <Link href={section.href} className="text-muted hover:text-foreground">
                  {section.label}
                </Link>
                <span className="text-subtle" aria-hidden>
                  /
                </span>
                <span className="text-foreground">{detail}</span>
              </>
            ) : (
              <label className="inline-flex items-center gap-1">
                <span className="sr-only">Seller section</span>
                <select
                  className="max-w-[12rem] cursor-pointer appearance-none border-0 bg-transparent py-0.5 font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={jump.some((s) => s.href === section.href) ? section.href : homeHref}
                  onChange={(e) => router.push(e.target.value)}
                  aria-label="Jump to seller section"
                >
                  {jump.map((s) => (
                    <option key={s.href} value={s.href}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        ) : (
          <>
            <span className="text-subtle" aria-hidden>
              /
            </span>
            <span className="text-muted">{approved ? 'Dashboard' : 'Onboarding'}</span>
          </>
        )}
      </nav>
    </div>
  );
}
