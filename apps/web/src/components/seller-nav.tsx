'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const SECTIONS = [
  { href: '/vendor', label: 'Dashboard', match: (p: string) => p === '/vendor' },
  {
    href: '/vendor/orders',
    label: 'Orders',
    match: (p: string) => p.startsWith('/vendor/orders'),
  },
  {
    href: '/vendor/products',
    label: 'Products',
    match: (p: string) => p.startsWith('/vendor/products'),
  },
  {
    href: '/vendor/earnings',
    label: 'Earnings',
    match: (p: string) => p.startsWith('/vendor/earnings'),
  },
  {
    href: '/vendor/shop',
    label: 'Shop',
    match: (p: string) => p.startsWith('/vendor/shop'),
  },
  {
    href: '/vendor/onboarding',
    label: 'Onboarding',
    match: (p: string) => p.startsWith('/vendor/onboarding'),
  },
  {
    href: '/vendor/apply',
    label: 'Apply',
    match: (p: string) => p.startsWith('/vendor/apply'),
  },
] as const;

function currentSection(pathname: string) {
  return SECTIONS.find((s) => s.match(pathname)) ?? SECTIONS[0];
}

function detailLabel(pathname: string): string | null {
  if (/^\/vendor\/orders\/[^/]+$/.test(pathname)) return 'Order detail';
  if (pathname === '/vendor/products/new') return 'New product';
  if (/^\/vendor\/products\/[^/]+$/.test(pathname)) return 'Edit product';
  return null;
}

export function SellerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const section = currentSection(pathname);
  const detail = detailLabel(pathname);
  const onDashboard = pathname === '/vendor';

  const jumpSections = SECTIONS.filter(
    (s) => s.href !== '/vendor/apply' && s.href !== '/vendor/onboarding',
  );

  return (
    <div className="border-b border-border bg-elevated/60">
      <nav
        aria-label="Seller breadcrumb"
        className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-6 py-3 text-sm"
      >
        <Link href="/vendor" className="font-semibold text-foreground hover:text-accent">
          Seller
        </Link>

        {!onDashboard || detail ? (
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
                  value={
                    jumpSections.some((s) => s.href === section.href) ? section.href : '/vendor'
                  }
                  onChange={(e) => router.push(e.target.value)}
                  aria-label="Jump to seller section"
                >
                  {jumpSections.map((s) => (
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
            <span className="text-muted">Dashboard</span>
          </>
        )}
      </nav>
    </div>
  );
}
