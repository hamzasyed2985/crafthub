'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchAdminInbox, type AdminInbox, type AdminInboxKind } from '@/lib/api';

function kindLabel(kind: AdminInboxKind): string {
  switch (kind) {
    case 'vendor_application':
      return 'Seller application';
    case 'category_suggestion':
      return 'Craft suggestion';
    case 'ledger_review':
      return 'Ledger review';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AdminInboxPanel({ className }: { className?: string }) {
  const [inbox, setInbox] = useState<AdminInbox | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminInbox()
      .then(setInbox)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load inbox'));
  }, []);

  if (error) {
    return <p className={`text-sm text-danger ${className ?? ''}`}>{error}</p>;
  }

  if (!inbox) {
    return (
      <div className={className}>
        <p className="text-sm text-subtle">Loading inbox…</p>
      </div>
    );
  }

  const { counts, items } = inbox;

  return (
    <section className={className} aria-label="Needs attention">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl">Needs attention</h2>
          <p className="mt-1 text-sm text-muted">
            Queues that need an admin decision — no tab-hopping required.
          </p>
        </div>
        {counts.total > 0 ? (
          <p className="text-sm text-muted">
            <span className="font-semibold text-foreground">{counts.total}</span> open
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Link
          href="/admin/vendors?status=pending"
          className="rounded-md border border-border bg-elevated p-4 transition-colors hover:border-border-strong"
        >
          <p className="text-sm text-subtle">Seller applications</p>
          <p className="mt-1 font-display text-2xl">{counts.pendingVendors}</p>
        </Link>
        <Link
          href="/admin/categories"
          className="rounded-md border border-border bg-elevated p-4 transition-colors hover:border-border-strong"
        >
          <p className="text-sm text-subtle">Craft suggestions</p>
          <p className="mt-1 font-display text-2xl">{counts.pendingCategorySuggestions}</p>
        </Link>
        <Link
          href="/admin/vendors?status=approved"
          className="rounded-md border border-border bg-elevated p-4 transition-colors hover:border-border-strong"
        >
          <p className="text-sm text-subtle">Ledger reviews</p>
          <p className="mt-1 font-display text-2xl">{counts.ledgerReviews}</p>
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-subtle">All clear — nothing waiting for review.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-md border border-border">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 transition-colors hover:bg-background-subtle"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-subtle">
                    {kindLabel(item.kind)}
                  </p>
                  <p className="mt-0.5 font-medium text-foreground">{item.title}</p>
                  {item.subtitle ? (
                    <p className="mt-0.5 truncate text-sm text-muted">{item.subtitle}</p>
                  ) : null}
                </div>
                <time
                  dateTime={item.createdAt}
                  className="shrink-0 text-xs text-subtle"
                  title={new Date(item.createdAt).toLocaleString()}
                >
                  {relativeTime(item.createdAt)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
