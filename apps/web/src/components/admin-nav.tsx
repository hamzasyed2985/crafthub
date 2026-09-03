'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { fetchAdminInbox } from '@/lib/api';
import { SITE_SHELL_INNER_CLASS } from '@/lib/site-shell';

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
    href: '/admin/categories',
    label: 'Categories',
    match: (p: string) => p.startsWith('/admin/categories'),
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
  const [inboxTotal, setInboxTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetchAdminInbox()
        .then((inbox) => {
          if (!cancelled) setInboxTotal(inbox.counts.total);
        })
        .catch(() => {
          if (!cancelled) setInboxTotal(0);
        });
    }
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pathname]);

  return (
    <div className="border-b border-border bg-elevated/60">
      <nav
        aria-label="Admin breadcrumb"
        className={`flex flex-wrap items-center gap-2 py-3 text-sm ${SITE_SHELL_INNER_CLASS}`}
      >
        <Link href="/admin" className="font-semibold text-foreground hover:text-accent">
          Admin
          {inboxTotal > 0 ? (
            <span
              className="ml-2 inline-flex min-w-5 items-center justify-center rounded-sm bg-accent px-1.5 py-0.5 text-xs font-semibold text-background"
              aria-label={`${inboxTotal} items need attention`}
            >
              {inboxTotal > 99 ? '99+' : inboxTotal}
            </span>
          ) : null}
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

        {inboxTotal > 0 && !onDashboard ? (
          <Link
            href="/admin"
            className="ml-auto text-sm text-accent hover:underline"
          >
            {inboxTotal} need attention →
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
