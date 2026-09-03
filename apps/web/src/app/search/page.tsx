'use client';

import { useEffect, useRef, useState, Suspense, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProductCard } from '@crafthub/ui';
import { LoadingMessage } from '@/components/loading-message';
import { LoadingOverlay } from '@/components/loading-overlay';
import { Page } from '@/components/page';
import { PageLoader } from '@/components/page-loader';
import { PaginationControls } from '@/components/pagination-controls';
import { ProductGridSkeleton } from '@/components/product-grid-skeleton';
import { ShopGridSkeleton } from '@/components/shop-grid-skeleton';
import { Spinner } from '@/components/spinner';
import { fetchCategories, searchCatalog, type ProductDto, type VendorSummary } from '@/lib/api';

const SUGGESTED_QUERIES = [
  'mug',
  'pottery',
  'walnut',
  'jewelry',
  'textile',
  'Islamabad',
  'wood',
  'candle',
] as const;

function SearchClient() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get('q') ?? '';
  const initialPage = Math.max(1, Number(params.get('page')) || 1);
  const initialShopPage = Math.max(1, Number(params.get('shopPage')) || 1);
  const [q, setQ] = useState(initial);
  const [page, setPage] = useState(initialPage);
  const [shopPage, setShopPage] = useState(initialShopPage);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [shops, setShops] = useState<VendorSummary[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>(
    [],
  );
  const [meta, setMeta] = useState<{
    totalProducts: number;
    totalShops: number;
    page: number;
    limit: number;
    shopPage: number;
    shopLimit: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => undefined);
  }, []);

  useEffect(() => {
    setQ(initial);
    setPage(initialPage);
    setShopPage(initialShopPage);
  }, [initial, initialPage, initialShopPage]);

  useEffect(() => {
    if (!initial.trim()) {
      setProducts([]);
      setShops([]);
      setMeta(null);
      setInitialLoading(false);
      setRefreshing(false);
      hasLoadedOnceRef.current = false;
      return;
    }

    let cancelled = false;
    const isInitial = !hasLoadedOnceRef.current;
    if (isInitial) setInitialLoading(true);
    else setRefreshing(true);

    searchCatalog(initial, page, 24, shopPage, 24)
      .then((res) => {
        if (cancelled) return;
        setProducts(res.products);
        setShops(res.shops);
        setMeta({
          totalProducts: res.meta.totalProducts,
          totalShops: res.meta.totalShops,
          page: res.meta.page,
          limit: res.meta.limit,
          shopPage: res.meta.shopPage,
          shopLimit: res.meta.shopLimit,
        });
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Search failed');
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
  }, [initial, page, shopPage]);

  function syncUrl(next: { page: number; shopPage: number }) {
    const qs = new URLSearchParams({ q: initial });
    if (next.page > 1) qs.set('page', String(next.page));
    if (next.shopPage > 1) qs.set('shopPage', String(next.shopPage));
    router.replace(`/search?${qs}`, { scroll: false });
  }

  function runSearch(query: string) {
    const next = query.trim();
    router.push(next ? `/search?q=${encodeURIComponent(next)}` : '/search');
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    runSearch(q);
  }

  function onProductPageChange(next: number) {
    setPage(next);
    syncUrl({ page: next, shopPage });
  }

  function onShopPageChange(next: number) {
    setShopPage(next);
    syncUrl({ page, shopPage: next });
  }

  const hasResults = products.length > 0 || shops.length > 0;
  const showLanding = !initial.trim() && !initialLoading;

  return (
    <Page size="wide" y="md">
      <section className="rounded-md border border-border bg-elevated/40 px-5 py-8 sm:px-8">
        <h1 className="font-display text-3xl">Search CraftHub</h1>
        <p className="mt-2 max-w-2xl text-muted">
          One search across <strong className="font-medium text-foreground">products</strong> and{' '}
          <strong className="font-medium text-foreground">maker shops</strong>. Explore filters
          products only; Makers lists shops only — this page finds both.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <input
            className="min-h-11 flex-1 rounded-sm border border-border-strong bg-elevated px-3 text-foreground"
            placeholder="Try mug, walnut, Islamabad…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search query"
            autoFocus={showLanding}
          />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-accent px-5 text-sm font-medium text-[var(--fg-on-accent)]"
          >
            {initialLoading ? <Spinner size="sm" label="Searching" /> : null}
            Search
          </button>
        </form>
      </section>

      {error ? <p className="mt-4 text-danger">{error}</p> : null}

      {showLanding ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_minmax(0,18rem)] lg:items-start">
          <div className="space-y-8">
            <section>
              <h2 className="font-display text-xl">Popular searches</h2>
              <p className="mt-1 text-sm text-muted">Tap a suggestion to search the full catalog.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SUGGESTED_QUERIES.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => runSearch(term)}
                    className="rounded-full border border-border bg-elevated px-3.5 py-1.5 text-sm capitalize text-foreground transition-colors hover:border-accent hover:bg-accent-muted"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </section>

            {categories.length > 0 ? (
              <section>
                <h2 className="font-display text-xl">Browse by category</h2>
                <p className="mt-1 text-sm text-muted">
                  Filter products on Explore, or search makers and goods by craft type.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <Link
                      key={c.id}
                      href={`/explore?category=${encodeURIComponent(c.slug)}`}
                      className="rounded-md border border-border bg-elevated/60 px-3 py-1.5 text-sm hover:border-accent"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-3">
            <h2 className="font-display text-xl">Other ways to browse</h2>
            <Link
              href="/explore"
              className="block rounded-md border border-border bg-elevated/60 p-4 transition-colors hover:border-accent"
            >
              <p className="font-semibold">Explore products</p>
              <p className="mt-1 text-sm text-muted">Filters, sort, price range, and grid layout.</p>
            </Link>
            <Link
              href="/shops"
              className="block rounded-md border border-border bg-elevated/60 p-4 transition-colors hover:border-accent"
            >
              <p className="font-semibold">Browse makers</p>
              <p className="mt-1 text-sm text-muted">Find artisans by name, city, or craft.</p>
            </Link>
          </aside>
        </div>
      ) : null}

      {initialLoading ? (
        <div className="mt-8 space-y-10">
          <LoadingMessage label="Searching catalog…" />
          <section>
            <h2 className="font-display text-2xl">Makers</h2>
            <div className="mt-4">
              <ShopGridSkeleton count={4} />
            </div>
          </section>
          <section>
            <h2 className="font-display text-2xl">Products</h2>
            <div className="mt-4">
              <ProductGridSkeleton count={6} cols={3} />
            </div>
          </section>
        </div>
      ) : null}

      {!initialLoading && initial && meta ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-subtle">
          {meta.totalProducts} product(s) · {meta.totalShops} shop(s) for “{initial}”
          {refreshing ? <Spinner size="sm" label="Updating search" /> : null}
        </p>
      ) : null}

      {!initialLoading && initial && hasResults ? (
        <div className={`relative mt-8 space-y-10 ${refreshing ? 'pointer-events-none' : ''}`}>
          {refreshing ? <LoadingOverlay label="Updating search…" /> : null}

          {shops.length > 0 ? (
            <section>
              <h2 className="font-display text-2xl">Makers</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shops.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/shops/${s.slug}`}
                      className="block rounded-md border border-border bg-elevated p-4 hover:border-[var(--border-strong)]"
                    >
                      <p className="font-semibold">{s.displayName}</p>
                      <p className="text-sm text-subtle">{s.city ?? s.slug}</p>
                    </Link>
                  </li>
                ))}
              </ul>
              {meta ? (
                <PaginationControls
                  page={meta.shopPage}
                  limit={meta.shopLimit}
                  total={meta.totalShops}
                  onPageChange={onShopPageChange}
                />
              ) : null}
            </section>
          ) : null}

          {products.length > 0 ? (
            <section>
              <h2 className="font-display text-2xl">Products</h2>
              <div className="mt-4 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
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
              {meta ? (
                <PaginationControls
                  page={meta.page}
                  limit={meta.limit}
                  total={meta.totalProducts}
                  onPageChange={onProductPageChange}
                />
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}

      {!initialLoading && !refreshing && initial && !hasResults ? (
        <div className="mt-10 rounded-md border border-border bg-elevated/40 p-6">
          <p className="text-muted">No results for “{initial}”. Try another craft, material, or city.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTED_QUERIES.slice(0, 5).map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => runSearch(term)}
                className="rounded-full border border-border px-3 py-1 text-sm capitalize hover:border-accent"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </Page>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <Page size="wide" y="md">
          <PageLoader label="Loading search…" />
        </Page>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
