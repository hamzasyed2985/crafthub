'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@crafthub/ui';
import { fetchVendorMe, fetchVendorProducts, type ProductDto } from '@/lib/api';

export default function VendorDashboardPage() {
  const [vendor, setVendor] = useState<Record<string, unknown> | null>(null);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchVendorMe(), fetchVendorProducts().catch(() => [] as ProductDto[])])
      .then(([v, p]) => {
        setVendor(v);
        setProducts(p);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p>{error}</p>
        <Link href="/vendor/apply">Apply to sell</Link>
      </div>
    );
  }

  if (!vendor) return <p className="px-6 py-12 text-subtle">Loading…</p>;

  const status = String(vendor.status);
  const lowStock = products.filter((p) => (p.variants[0]?.stockQty ?? 0) < 3 && p.status === 'active');

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{String(vendor.displayName)}</h1>
          <p className="text-muted">
            Status: {status}
            {status === 'approved' ? (
              <>
                {' '}
                ·{' '}
                <Link href={`/shops/${vendor.slug}`} className="text-accent">
                  View public shop
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/vendor/shop">
            <Button variant="secondary" size="sm">
              Edit shop
            </Button>
          </Link>
          <Link href="/vendor/products/new">
            <Button size="sm" disabled={status !== 'approved'}>
              New product
            </Button>
          </Link>
        </div>
      </div>

      {status === 'pending' ? (
        <p className="mt-6 rounded-md border border-border bg-accent-muted/40 px-4 py-3 text-sm">
          Your application is pending. You can edit branding after approval. See{' '}
          <Link href="/vendor/onboarding" className="underline">
            onboarding
          </Link>
          .
        </p>
      ) : null}

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-elevated p-4">
          <p className="text-sm text-subtle">Products</p>
          <p className="font-display text-3xl">{products.length}</p>
        </div>
        <div className="rounded-md border border-border bg-elevated p-4">
          <p className="text-sm text-subtle">Low stock</p>
          <p className="font-display text-3xl">{lowStock.length}</p>
        </div>
        <div className="rounded-md border border-border bg-elevated p-4">
          <p className="text-sm text-subtle">Orders</p>
          <p className="font-display text-3xl text-subtle">—</p>
          <p className="text-xs text-subtle">Phase 4</p>
        </div>
      </div>

      <h2 className="mt-12 font-display text-2xl">Products</h2>
      <ul className="mt-4 divide-y divide-border">
        {products.map((p) => (
          <li key={p.id} className="flex items-center justify-between py-3">
            <div>
              <Link href={`/vendor/products/${p.id}`} className="font-semibold hover:text-accent">
                {p.title}
              </Link>
              <p className="text-sm text-subtle">
                {p.status} · {p.variants[0] ? `$${(p.variants[0].priceCents / 100).toFixed(2)}` : '—'}
              </p>
            </div>
            <Link href={`/vendor/products/${p.id}`} className="text-sm text-accent">
              Edit
            </Link>
          </li>
        ))}
      </ul>
      {products.length === 0 ? <p className="mt-4 text-muted">No products yet.</p> : null}
    </div>
  );
}
