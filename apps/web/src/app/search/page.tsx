'use client';

import { useEffect, useState, Suspense, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProductCard } from '@crafthub/ui';
import { Page } from '@/components/page';
import { PaginationControls } from '@/components/pagination-controls';
import { searchCatalog, type ProductDto, type VendorSummary } from '@/lib/api';

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
  const [meta, setMeta] = useState<{
    totalProducts: number;
    totalShops: number;
    page: number;
    limit: number;
    shopPage: number;
    shopLimit: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      return;
    }
    setLoading(true);
    searchCatalog(initial, page, 24, shopPage, 24)
      .then((res) => {
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
      .catch((err) => setError(err instanceof Error ? err.message : 'Search failed'))
      .finally(() => setLoading(false));
  }, [initial, page, shopPage]);

  function syncUrl(next: { page: number; shopPage: number }) {
    const qs = new URLSearchParams({ q: initial });
    if (next.page > 1) qs.set('page', String(next.page));
    if (next.shopPage > 1) qs.set('shopPage', String(next.shopPage));
    router.replace(`/search?${qs}`, { scroll: false });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = q.trim();
    router.push(next ? `/search?q=${encodeURIComponent(next)}` : '/search');
  }

  function onProductPageChange(next: number) {
    setPage(next);
    syncUrl({ page: next, shopPage });
  }

  function onShopPageChange(next: number) {
    setShopPage(next);
    syncUrl({ page, shopPage: next });
  }

  return (
    <Page size="wide" y="sm">
      <h1 className="font-display text-3xl">Search</h1>
      <p className="mt-1 text-muted">Find products and makers across CraftHub.</p>

      <form onSubmit={onSubmit} className="mt-6 flex gap-2">
        <input
          className="min-h-11 flex-1 rounded-sm border border-border-strong bg-elevated px-3 text-foreground"
          placeholder="Try mug, walnut, Islamabad…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search query"
        />
        <button
          type="submit"
          className="min-h-11 rounded-sm bg-accent px-4 text-sm font-medium text-[var(--fg-on-accent)]"
        >
          Search
        </button>
      </form>

      {error ? <p className="mt-4 text-danger">{error}</p> : null}
      {loading ? <p className="mt-8 text-subtle">Searching…</p> : null}

      {!loading && initial && meta ? (
        <p className="mt-6 text-sm text-subtle">
          {meta.totalProducts} product(s) · {meta.totalShops} shop(s) for “{initial}”
        </p>
      ) : null}

      {!loading && initial && shops.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-2xl">Makers</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
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

      {!loading && initial && products.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-2xl">Products</h2>
          <div className="mt-4 grid grid-cols-2 gap-6 md:grid-cols-3">
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

      {!loading && initial && products.length === 0 && shops.length === 0 ? (
        <p className="mt-10 text-muted">No results. Try another craft or city.</p>
      ) : null}
    </Page>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <Page size="wide">
          <p className="text-subtle">Loading search…</p>
        </Page>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
