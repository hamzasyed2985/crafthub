'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@crafthub/ui';
import { Page } from '@/components/page';
import { PaginationControls } from '@/components/pagination-controls';
import { fetchShops } from '@/lib/api';

type ShopRow = Awaited<ReturnType<typeof fetchShops>>['data'][number];

export default function ShopsPage() {
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(24);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '24' };
    if (q) params.q = q;
    fetchShops(params)
      .then((res) => {
        setShops(res.data);
        setTotal(res.meta.total);
        setLimit(res.meta.limit);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [q, page]);

  return (
    <Page size="wide" y="sm">
      <h1 className="font-display text-3xl">Makers</h1>
      <p className="mt-2 max-w-2xl text-muted">
        <strong className="font-semibold text-foreground">Makers</strong> are the artisans who sell
        on CraftHub — potters, jewelers, woodworkers, textile artists, and food crafters. Each maker
        runs their own shop, sets their own prices, and ships what they make. CraftHub is the
        marketplace that connects you to them.
      </p>

      <div className="mt-6 grid gap-4 border-t border-border pt-6 text-sm text-muted sm:grid-cols-3">
        <p>
          <span className="font-semibold text-foreground">Not a big-box store.</span> You’re buying
          from a person or small studio, not a warehouse brand.
        </p>
        <p>
          <span className="font-semibold text-foreground">One cart, many shops.</span> You can
          checkout items from several makers together; each maker fulfills their own pieces.
        </p>
        <p>
          <span className="font-semibold text-foreground">Browse products too.</span>{' '}
          <Link href="/explore" className="text-accent hover:underline">
            Explore
          </Link>{' '}
          lists individual handmade goods. This page is for finding the people behind them.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="min-h-11 w-full max-w-md rounded-sm border border-border-strong bg-elevated px-3"
          placeholder="Search by name, city, or craft…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          aria-label="Search makers"
        />
        <Link href="/vendor/apply" className="shrink-0">
          <Button variant="secondary" size="sm">
            Become a maker
          </Button>
        </Link>
      </div>

      <p className="mt-4 text-sm text-muted">
        {loading
          ? 'Loading makers…'
          : `${total} approved maker${total === 1 ? '' : 's'}${q.trim() ? ' matching your search' : ''}`}
      </p>

      {error ? <p className="mt-4 text-danger">{error}</p> : null}

      {!loading && shops.length === 0 ? (
        <p className="mt-10 text-muted">No makers match that search. Try another city or craft word.</p>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((s) => (
            <li key={s.id}>
              <Link
                href={`/shops/${s.slug}`}
                className="flex h-full flex-col gap-3 rounded-md border border-border bg-elevated/50 p-4 transition-colors hover:border-accent"
              >
                <div className="flex items-start gap-3">
                  {s.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logoUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-muted font-display text-lg text-accent">
                      {s.displayName.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-display text-xl leading-tight">{s.displayName}</p>
                    {s.city ? <p className="mt-0.5 text-sm text-muted">{s.city}</p> : null}
                  </div>
                </div>
                {s.bio ? <p className="line-clamp-3 text-sm text-subtle">{s.bio}</p> : null}
                {s.craftTags && s.craftTags.length > 0 ? (
                  <p className="mt-auto text-xs text-muted">
                    {s.craftTags.slice(0, 4).join(' · ')}
                  </p>
                ) : null}
                <span className="text-sm text-accent">Visit shop →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <PaginationControls page={page} limit={limit} total={total} onPageChange={setPage} />
    </Page>
  );
}
