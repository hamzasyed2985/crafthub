'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ProductCard } from '@crafthub/ui';
import { Page } from '@/components/page';
import { PaginationControls } from '@/components/pagination-controls';
import { fetchCategories, fetchProducts, type ProductDto } from '@/lib/api';

type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'title';

function dollarsToCents(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100);
}

function centsToDollarsInput(cents: number | undefined): string {
  if (cents == null) return '';
  return String(cents / 100);
}

function ExploreCatalog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>(
    [],
  );
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [sort, setSort] = useState<SortKey>((searchParams.get('sort') as SortKey) || 'newest');
  const [minDollars, setMinDollars] = useState(
    centsToDollarsInput(
      searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    ),
  );
  const [maxDollars, setMaxDollars] = useState(
    centsToDollarsInput(
      searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    ),
  );
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page')) || 1));
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(24);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => undefined);
  }, []);

  const syncUrl = useCallback(
    (next: {
      q: string;
      category: string;
      sort: SortKey;
      minDollars: string;
      maxDollars: string;
      page: number;
    }) => {
      const params = new URLSearchParams();
      if (next.q.trim()) params.set('q', next.q.trim());
      if (next.category) params.set('category', next.category);
      if (next.sort && next.sort !== 'newest') params.set('sort', next.sort);
      const minC = dollarsToCents(next.minDollars);
      const maxC = dollarsToCents(next.maxDollars);
      if (minC != null) params.set('minPrice', String(minC));
      if (maxC != null) params.set('maxPrice', String(maxC));
      if (next.page > 1) params.set('page', String(next.page));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {
      page: String(page),
      limit: '24',
      sort,
    };
    if (q.trim()) params.q = q.trim();
    if (category) params.category = category;
    const minC = dollarsToCents(minDollars);
    const maxC = dollarsToCents(maxDollars);
    if (minC != null) params.minPrice = String(minC);
    if (maxC != null) params.maxPrice = String(maxC);

    fetchProducts(params)
      .then((res) => {
        setProducts(res.data);
        setTotal(res.meta.total);
        setLimit(res.meta.limit);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [q, category, page, sort, minDollars, maxDollars]);

  const hasFilters = useMemo(
    () =>
      Boolean(q.trim() || category || minDollars.trim() || maxDollars.trim() || sort !== 'newest'),
    [q, category, minDollars, maxDollars, sort],
  );

  function clearFilters() {
    setQ('');
    setCategory('');
    setSort('newest');
    setMinDollars('');
    setMaxDollars('');
    setPage(1);
    syncUrl({
      q: '',
      category: '',
      sort: 'newest',
      minDollars: '',
      maxDollars: '',
      page: 1,
    });
  }

  return (
    <Page size="wide" y="sm">
      <h1 className="font-display text-3xl">Explore</h1>
      <p className="mt-1 text-muted">Browse handmade goods from approved CraftHub shops.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          className="min-h-11 rounded-sm border border-border-strong bg-elevated px-3 text-foreground sm:col-span-2"
          placeholder="Search products…"
          value={q}
          onChange={(e) => {
            const next = e.target.value;
            setQ(next);
            setPage(1);
            syncUrl({
              q: next,
              category,
              sort,
              minDollars,
              maxDollars,
              page: 1,
            });
          }}
        />
        <select
          className="min-h-11 rounded-sm border border-border-strong bg-elevated px-3 text-foreground"
          value={category}
          onChange={(e) => {
            const next = e.target.value;
            setCategory(next);
            setPage(1);
            syncUrl({ q, category: next, sort, minDollars, maxDollars, page: 1 });
          }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="min-h-11 rounded-sm border border-border-strong bg-elevated px-3 text-foreground"
          value={sort}
          onChange={(e) => {
            const next = e.target.value as SortKey;
            setSort(next);
            setPage(1);
            syncUrl({ q, category, sort: next, minDollars, maxDollars, page: 1 });
          }}
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="title">Name A–Z</option>
        </select>
        <input
          className="min-h-11 rounded-sm border border-border-strong bg-elevated px-3 text-foreground"
          type="number"
          min={0}
          step="1"
          placeholder="Min $"
          value={minDollars}
          onChange={(e) => {
            const next = e.target.value;
            setMinDollars(next);
            setPage(1);
            syncUrl({ q, category, sort, minDollars: next, maxDollars, page: 1 });
          }}
        />
        <input
          className="min-h-11 rounded-sm border border-border-strong bg-elevated px-3 text-foreground"
          type="number"
          min={0}
          step="1"
          placeholder="Max $"
          value={maxDollars}
          onChange={(e) => {
            const next = e.target.value;
            setMaxDollars(next);
            setPage(1);
            syncUrl({ q, category, sort, minDollars, maxDollars: next, page: 1 });
          }}
        />
      </div>

      {categories.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-md border px-3 py-1.5 text-sm ${
              !category ? 'border-accent bg-accent-muted' : 'border-border'
            }`}
            onClick={() => {
              setCategory('');
              setPage(1);
              syncUrl({ q, category: '', sort, minDollars, maxDollars, page: 1 });
            }}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`rounded-md border px-3 py-1.5 text-sm ${
                category === c.slug ? 'border-accent bg-accent-muted' : 'border-border'
              }`}
              onClick={() => {
                setCategory(c.slug);
                setPage(1);
                syncUrl({ q, category: c.slug, sort, minDollars, maxDollars, page: 1 });
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {loading ? 'Loading…' : `${total} piece${total === 1 ? '' : 's'}`}
        </p>
        {hasFilters ? (
          <button
            type="button"
            className="text-sm text-accent hover:underline"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-danger">{error}</p> : null}

      {!loading && products.length === 0 ? (
        <p className="mt-10 text-muted">No products match these filters.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => {
            const variant = p.variants[0];
            return (
              <ProductCard
                key={p.id}
                href={`/shops/${p.shop.vendor.slug}/products/${p.slug}`}
                title={p.title}
                imageUrl={p.media[0]?.url}
                imageAlt={p.media[0]?.alt}
                priceCents={variant?.priceCents ?? 0}
                currency={variant?.currency ?? 'USD'}
                vendorName={p.shop.vendor.displayName}
                vendorHref={`/shops/${p.shop.vendor.slug}`}
              />
            );
          })}
        </div>
      )}

      <PaginationControls
        page={page}
        limit={limit}
        total={total}
        onPageChange={(p) => {
          setPage(p);
          syncUrl({ q, category, sort, minDollars, maxDollars, page: p });
        }}
      />
    </Page>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <Page size="wide" y="sm">
          <p className="text-subtle">Loading…</p>
        </Page>
      }
    >
      <ExploreCatalog />
    </Suspense>
  );
}
