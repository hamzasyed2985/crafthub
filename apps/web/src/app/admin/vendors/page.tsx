'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@crafthub/ui';
import { Page } from '@/components/page';
import { PaginationControls } from '@/components/pagination-controls';
import { fetchAdminVendors, patchAdminVendor, type VendorSummary } from '@/lib/api';
import { formatStatusLabel } from '@/lib/format-status';

type Row = VendorSummary & { user: { email: string; name: string | null } };

function AdminVendorsClient() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') ?? 'pending';
  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [vendors, setVendors] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(24);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setStatus(initialStatus);
    setPage(1);
  }, [initialStatus]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [qInput]);

  async function load(nextStatus = status, nextPage = page, nextQ = q) {
    try {
      const res = await fetchAdminVendors(nextStatus || undefined, nextPage, 24, nextQ || undefined);
      setVendors(res.data as Row[]);
      setTotal(res.meta.total);
      setLimit(res.meta.limit);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  useEffect(() => {
    void load(status, page, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page, q]);

  async function setVendorStatus(id: string, next: 'approved' | 'suspended' | 'pending') {
    setBusyId(id);
    try {
      await patchAdminVendor(id, { status: next });
      await load(status, page, q);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Page size="default">
      <h1 className="font-display text-3xl">Vendors</h1>
      <p className="mt-1 text-muted">Approve makers so their shops appear publicly.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {['pending', 'approved', 'suspended', ''].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              status === s ? 'border-accent bg-accent-muted' : 'border-border'
            }`}
          >
            {s ? formatStatusLabel(s) : 'All'}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="sr-only">Search vendors</span>
        <input
          type="search"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Search by name, email, slug, or city…"
          className="min-h-11 w-full max-w-md rounded-sm border border-border-strong bg-elevated px-3 text-sm text-foreground"
        />
      </label>
      {q ? (
        <p className="mt-2 text-sm text-subtle">
          {total} match{total === 1 ? '' : 'es'} for “{q}”
        </p>
      ) : null}

      {error ? <p className="mt-4 text-danger">{error}</p> : null}

      <ul className="mt-8 divide-y divide-border">
        {vendors.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-semibold">{v.displayName}</p>
              <p className="text-sm text-subtle">
                {v.user.email} · {v.city} · {formatStatusLabel(v.status)}
                {v.ledgerReviewRequired ? ' · Ledger review' : ''}
              </p>
              <Link href={`/shops/${v.slug}`} className="text-sm text-accent">
                /shops/{v.slug}
              </Link>
            </div>
            <div className="flex gap-2">
              {v.status !== 'approved' ? (
                <Button
                  size="sm"
                  loading={busyId === v.id}
                  onClick={() => void setVendorStatus(v.id, 'approved')}
                >
                  Approve
                </Button>
              ) : null}
              {v.status !== 'suspended' ? (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={busyId === v.id}
                  onClick={() => void setVendorStatus(v.id, 'suspended')}
                >
                  Suspend
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={busyId === v.id}
                  onClick={() => void setVendorStatus(v.id, 'approved')}
                >
                  Reinstate
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {vendors.length === 0 ? (
        <p className="mt-6 text-muted">
          {q ? 'No vendors match this search.' : 'No vendors in this filter.'}
        </p>
      ) : null}
      <PaginationControls page={page} limit={limit} total={total} onPageChange={setPage} />
    </Page>
  );
}

export default function AdminVendorsPage() {
  return (
    <Suspense
      fallback={
        <Page size="default">
          <p className="text-subtle">Loading vendors…</p>
        </Page>
      }
    >
      <AdminVendorsClient />
    </Suspense>
  );
}
