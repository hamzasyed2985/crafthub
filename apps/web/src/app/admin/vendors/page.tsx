'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@crafthub/ui';
import { fetchAdminVendors, patchAdminVendor, type VendorSummary } from '@/lib/api';

type Row = VendorSummary & { user: { email: string; name: string | null } };

export default function AdminVendorsPage() {
  const [status, setStatus] = useState('pending');
  const [vendors, setVendors] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(nextStatus = status) {
    try {
      const res = await fetchAdminVendors(nextStatus || undefined);
      setVendors(res.data as Row[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  useEffect(() => {
    void load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function setVendorStatus(id: string, next: 'approved' | 'suspended' | 'pending') {
    setBusyId(id);
    try {
      await patchAdminVendor(id, { status: next });
      await load(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-3xl">Vendors</h1>
      <p className="mt-1 text-muted">Approve makers so their shops appear publicly.</p>

      <div className="mt-6 flex gap-2">
        {['pending', 'approved', 'suspended', ''].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              status === s ? 'border-accent bg-accent-muted' : 'border-border'
            }`}
          >
            {s || 'all'}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 text-danger">{error}</p> : null}

      <ul className="mt-8 divide-y divide-border">
        {vendors.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-semibold">{v.displayName}</p>
              <p className="text-sm text-subtle">
                {v.user.email} · {v.city} · {v.status}
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
                  variant="danger"
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
      {vendors.length === 0 ? <p className="mt-6 text-muted">No vendors in this filter.</p> : null}
    </div>
  );
}
