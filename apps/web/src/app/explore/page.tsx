'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ProductCard, Select } from '@crafthub/ui';
import { Page } from '@/components/page';
import { CatalogViewToolbar } from '@/components/catalog-view-toolbar';
import { IconClose, IconSearch } from '@/components/icons';
import { LoadingOverlay } from '@/components/loading-overlay';
import { PageLoader } from '@/components/page-loader';
import { PaginationControls } from '@/components/pagination-controls';
import { ProductGridSkeleton } from '@/components/product-grid-skeleton';
import { fetchCategories, fetchProducts, type ProductDto } from '@/lib/api';

type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'title';
type GridCols = 3 | 4 | 5;

const PAGE_SIZE_OPTIONS = [12, 24, 48] as const;

const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  title: 'Name A–Z',
};

const FIELD_CLASS =
  'min-h-11 w-full rounded-md border border-border-strong bg-elevated px-3 py-2.5 text-base text-foreground outline-none transition-colors focus:border-accent';

const SELECT_CLASS =
  'rounded-md border-border-strong focus-visible:outline-none focus-visible:outline-offset-0 focus:border-accent';

const LABEL_CLASS = 'mb-1.5 block text-xs font-medium tracking-wide text-subtle';

const GRID_CLASS: Record<GridCols, string> = {
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
};

function parseGridCols(raw: string | null): GridCols {
  const n = Number(raw);
  if (n === 3 || n === 4 || n === 5) return n;
  return 4;
}

function parsePageSize(raw: string | null): number {
  const n = Number(raw);
  if (PAGE_SIZE_OPTIONS.includes(n as (typeof PAGE_SIZE_OPTIONS)[number])) return n;
  return 24;
}

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
  const [pageSize, setPageSize] = useState(parsePageSize(searchParams.get('limit')));
  const [gridCols, setGridCols] = useState<GridCols>(parseGridCols(searchParams.get('cols')));
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(pageSize);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnceRef = useRef(false);

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
      pageSize: number;
      gridCols: GridCols;
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
      if (next.pageSize !== 24) params.set('limit', String(next.pageSize));
      if (next.gridCols !== 4) params.set('cols', String(next.gridCols));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    let cancelled = false;
    const isInitial = !hasLoadedOnceRef.current;
    if (isInitial) setInitialLoading(true);
    else setRefreshing(true);

    const params: Record<string, string> = {
      page: String(page),
      limit: String(pageSize),
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
        if (cancelled) return;
        const nextLimit = res.meta.limit;
        const nextTotal = res.meta.total;
        const nextPageCount = Math.max(1, Math.ceil(nextTotal / Math.max(nextLimit, 1)));
        if (page > nextPageCount) {
          setPage(nextPageCount);
          syncUrl({
            q,
            category,
            sort,
            minDollars,
            maxDollars,
            page: nextPageCount,
            pageSize,
            gridCols,
          });
          return;
        }
        setProducts(res.data);
        setTotal(nextTotal);
        setLimit(nextLimit);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) {
          setInitialLoading(false);
          setRefreshing(false);
          hasLoadedOnceRef.current = true;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [q, category, page, pageSize, sort, minDollars, maxDollars, syncUrl]);

  const hasFilters = useMemo(
    () =>
      Boolean(q.trim() || category || minDollars.trim() || maxDollars.trim() || sort !== 'newest'),
    [q, category, minDollars, maxDollars, sort],
  );

  const categoryName = useMemo(
    () => categories.find((c) => c.slug === category)?.name ?? category,
    [categories, category],
  );

  const priceChipLabel = useMemo(() => {
    const min = minDollars.trim();
    const max = maxDollars.trim();
    if (min && max) return `$${min}–$${max}`;
    if (min) return `From $${min}`;
    if (max) return `Up to $${max}`;
    return null;
  }, [minDollars, maxDollars]);

  function patchFilters(
    patch: Partial<{
      q: string;
      category: string;
      sort: SortKey;
      minDollars: string;
      maxDollars: string;
    }>,
  ) {
    const next = {
      q: patch.q ?? q,
      category: patch.category ?? category,
      sort: patch.sort ?? sort,
      minDollars: patch.minDollars ?? minDollars,
      maxDollars: patch.maxDollars ?? maxDollars,
      page: 1,
      pageSize,
      gridCols,
    };
    if (patch.q !== undefined) setQ(patch.q);
    if (patch.category !== undefined) setCategory(patch.category);
    if (patch.sort !== undefined) setSort(patch.sort);
    if (patch.minDollars !== undefined) setMinDollars(patch.minDollars);
    if (patch.maxDollars !== undefined) setMaxDollars(patch.maxDollars);
    setPage(1);
    syncUrl(next);
  }

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
      pageSize,
      gridCols,
    });
  }

  function updatePage(next: number) {
    setPage(next);
    syncUrl({ q, category, sort, minDollars, maxDollars, page: next, pageSize, gridCols });
  }

  function updatePageSize(next: number) {
    setPageSize(next);
    setPage(1);
    syncUrl({ q, category, sort, minDollars, maxDollars, page: 1, pageSize: next, gridCols });
  }

  function updateGridCols(next: GridCols) {
    setGridCols(next);
    syncUrl({ q, category, sort, minDollars, maxDollars, page, pageSize, gridCols: next });
  }

  return (
    <Page size="wide" y="md">
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl">Explore</h1>
        <p className="mt-1 text-muted">Browse handmade goods from approved CraftHub shops.</p>
      </header>

      <section className="mt-8 space-y-5" aria-label="Catalog filters">
        <div>
          <label htmlFor="explore-search" className={LABEL_CLASS}>
            Search
          </label>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              id="explore-search"
              className={`${FIELD_CLASS} pl-10 pr-10`}
              placeholder="Search products, makers, materials…"
              value={q}
              onChange={(e) => patchFilters({ q: e.target.value })}
            />
            {q.trim() ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-background-subtle hover:text-foreground"
                aria-label="Clear search"
                onClick={() => patchFilters({ q: '' })}
              >
                <IconClose className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_minmax(12rem,0.9fr)]">
          <div>
            <label htmlFor="explore-category" className={LABEL_CLASS}>
              Craft
            </label>
            <Select
              id="explore-category"
              className={SELECT_CLASS}
              value={category}
              onChange={(e) => patchFilters({ category: e.target.value })}
            >
              <option value="">All crafts</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="explore-sort" className={LABEL_CLASS}>
              Sort by
            </label>
            <Select
              id="explore-sort"
              className={SELECT_CLASS}
              value={sort}
              onChange={(e) => patchFilters({ sort: e.target.value as SortKey })}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <span className={LABEL_CLASS}>Price (USD)</span>
            <div className="flex items-center gap-2">
              <input
                id="explore-min-price"
                className={FIELD_CLASS}
                type="number"
                min={0}
                step="1"
                inputMode="decimal"
                placeholder="Min"
                aria-label="Minimum price"
                value={minDollars}
                onChange={(e) => patchFilters({ minDollars: e.target.value })}
              />
              <span className="shrink-0 text-subtle" aria-hidden>
                –
              </span>
              <input
                id="explore-max-price"
                className={FIELD_CLASS}
                type="number"
                min={0}
                step="1"
                inputMode="decimal"
                placeholder="Max"
                aria-label="Maximum price"
                value={maxDollars}
                onChange={(e) => patchFilters({ maxDollars: e.target.value })}
              />
            </div>
          </div>
        </div>

        {hasFilters ? (
          <div className="flex flex-wrap items-center gap-2">
            {q.trim() ? (
              <button
                type="button"
                onClick={() => patchFilters({ q: '' })}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-2.5 py-1 text-sm text-foreground hover:border-accent"
              >
                “{q.trim()}”
                <IconClose className="h-3.5 w-3.5 text-muted" />
              </button>
            ) : null}
            {category ? (
              <button
                type="button"
                onClick={() => patchFilters({ category: '' })}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-2.5 py-1 text-sm text-foreground hover:border-accent"
              >
                {categoryName}
                <IconClose className="h-3.5 w-3.5 text-muted" />
              </button>
            ) : null}
            {priceChipLabel ? (
              <button
                type="button"
                onClick={() => patchFilters({ minDollars: '', maxDollars: '' })}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-2.5 py-1 text-sm text-foreground hover:border-accent"
              >
                {priceChipLabel}
                <IconClose className="h-3.5 w-3.5 text-muted" />
              </button>
            ) : null}
            {sort !== 'newest' ? (
              <button
                type="button"
                onClick={() => patchFilters({ sort: 'newest' })}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-2.5 py-1 text-sm text-foreground hover:border-accent"
              >
                {SORT_LABELS[sort]}
                <IconClose className="h-3.5 w-3.5 text-muted" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={clearFilters}
              className="px-1 text-sm text-accent hover:underline"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </section>

      <CatalogViewToolbar
        gridCols={gridCols}
        onGridColsChange={updateGridCols}
        total={total}
        initialLoading={initialLoading}
        refreshing={refreshing}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
      />

      {error ? <p className="mt-4 text-danger">{error}</p> : null}

      {initialLoading ? (
        <ProductGridSkeleton count={pageSize} cols={gridCols} />
      ) : products.length === 0 ? (
        <p className="mt-10 text-muted">No products match these filters.</p>
      ) : (
        <div className="relative mt-6">
          {refreshing ? <LoadingOverlay label="Updating results…" /> : null}
          <div
            className={`grid gap-4 sm:gap-5 ${GRID_CLASS[gridCols]} ${
              refreshing ? 'pointer-events-none opacity-60' : ''
            }`}
          >
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
        </div>
      )}

      <PaginationControls
        page={page}
        limit={limit}
        total={total}
        onPageChange={updatePage}
        pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
        onPageSizeChange={updatePageSize}
      />
    </Page>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <Page size="wide" y="md">
          <PageLoader label="Loading explore…" />
        </Page>
      }
    >
      <ExploreCatalog />
    </Suspense>
  );
}
