'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const SECTIONS = [
  { href: '/admin', label: 'Dashboard', match: (p: string) => p === '/admin' },
  {
    href: '/admin/finance',
    label: 'Finance',
    match: (p: string) => p.startsWith('/admin/finance'),
  },
  {
    href: '/admin/orders',
    label: 'Orders',
    match: (p: string) => p.startsWith('/admin/orders'),
  },
  {
    href: '/admin/vendors',
    label: 'Vendors',
    match: (p: string) => p.startsWith('/admin/vendors'),
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    match: (p: string) => p.startsWith('/admin/settings'),
  },
  {
    href: '/admin/audit-logs',
    label: 'Audit log',
    match: (p: string) => p.startsWith('/admin/audit-logs'),
  },
] as const;

function currentSection(pathname: string) {
  return SECTIONS.find((s) => s.match(pathname)) ?? SECTIONS[0];
}

function detailLabel(pathname: string): string | null {
  if (/^\/admin\/orders\/[^/]+$/.test(pathname)) return 'Order detail';
  return null;
}

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const section = currentSection(pathname);
  const detail = detailLabel(pathname);
  const onDashboard = pathname === '/admin';

  return (
    <div className="border-b border-border bg-elevated/60">
      <nav
        aria-label="Admin breadcrumb"
        className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-6 py-3 text-sm"
      >
        <Link href="/admin" className="font-semibold text-foreground hover:text-accent">
          Admin
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
                <span className="sr-only">Admin section</span>
                <select
                  className="max-w-[12rem] cursor-pointer appearance-none border-0 bg-transparent py-0.5 font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={section.href}
                  onChange={(e) => router.push(e.target.value)}
                  aria-label="Jump to admin section"
                >
                  <option value="/admin">Dashboard</option>
                  {SECTIONS.filter((s) => s.href !== '/admin').map((s) => (
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
