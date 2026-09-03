'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Price } from '@crafthub/ui';
import { ListRowSkeleton } from '@/components/list-row-skeleton';
import { Page } from '@/components/page';
import { PaginationControls } from '@/components/pagination-controls';
import { fetchVendorProducts, type ProductDto } from '@/lib/api';
import { formatStatusLabel } from '@/lib/format-status';

export default function VendorProductsPage() {
  const [products, setProducts] = useState<ProductDto[] | null>(null);
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(24);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setProducts(null);
    const params: Record<string, string> = { page: String(page), limit: '24' };
    if (q) params.q = q;
    fetchVendorProducts(params)
      .then((res) => {
        setProducts(res.data);
        setTotal(res.meta.total);
        setLimit(res.meta.limit);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, [page, q]);

  if (error) {
    return (
      <Page size="wide">
        <p className="text-danger">{error}</p>
      </Page>
    );
  }

  return (
    <Page size="wide">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Products</h1>
          <p className="mt-2 text-muted">All listings in your shop.</p>
        </div>
        <Link href="/vendor/products/new">
          <Button size="sm">New product</Button>
        </Link>
      </div>

      <label className="mt-6 block">
        <span className="sr-only">Search products</span>
        <input
          type="search"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Search by title, slug, description, or SKU…"
          className="min-h-11 w-full rounded-sm border border-border-strong bg-elevated px-3 text-sm text-foreground"
        />
      </label>
      {q ? (
        <p className="mt-2 text-sm text-subtle">
          {total} match{total === 1 ? '' : 'es'} for “{q}”
        </p>
      ) : null}

      {!products ? (
        <ListRowSkeleton rows={6} columns={3} />
      ) : products.length === 0 ? (
        <p className="mt-8 text-subtle">
          {q ? (
            'No products match this search.'
          ) : (
            <>
              No products yet.{' '}
              <Link href="/vendor/products/new" className="text-accent">
                Create one
              </Link>
            </>
          )}
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-border">
          {products.map((p) => {
            const variant = p.variants[0];
            const thumb = p.media[0]?.url;
            return (
              <li key={p.id} className="flex gap-4 py-4">
                <Link
                  href={`/vendor/products/${p.id}`}
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-background-subtle"
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-subtle">
                      —
                    </span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/vendor/products/${p.id}`}
                    className="font-semibold hover:text-accent"
                  >
                    {p.title}
                  </Link>
                  <p className="mt-0.5 text-sm text-subtle">
                    {formatStatusLabel(p.status)}
                    {variant ? (
                      <>
                        {' '}
                        · <Price cents={variant.priceCents} currency={variant.currency} /> · stock{' '}
                        {variant.stockQty}
                      </>
                    ) : null}
                  </p>
                </div>
                <Link
                  href={`/vendor/products/${p.id}`}
                  className="shrink-0 self-center text-sm text-accent"
                >
                  Edit
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <PaginationControls page={page} limit={limit} total={total} onPageChange={setPage} />
    </Page>
  );
}
