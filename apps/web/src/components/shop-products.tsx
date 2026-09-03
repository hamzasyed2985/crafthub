'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductCard, Price } from '@crafthub/ui';
import { PaginationControls } from '@/components/pagination-controls';
import { LoadingOverlay } from '@/components/loading-overlay';
import { ProductGridSkeleton } from '@/components/product-grid-skeleton';
import { fetchShopPage } from '@/lib/api';

type ProductRow = {
  id: string;
  title: string;
  slug: string;
  media: Array<{ url: string; alt: string }>;
  variants: Array<{ priceCents: number; currency: string }>;
};

export function ShopProducts({ slug, initialPage }: { slug: string; initialPage: number }) {
  const router = useRouter();
  const [page, setPage] = useState(initialPage);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(24);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flatShippingCents, setFlatShippingCents] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const isInitial = products.length === 0;
    if (isInitial) setLoading(true);
    else setRefreshing(true);

    fetchShopPage(slug, { page: String(page), limit: '24' })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.data.products);
        setTotal(res.meta.total);
        setLimit(res.meta.limit);
        setFlatShippingCents(res.data.shop.flatShippingCents);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load products');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, page]);

  function onPageChange(next: number) {
    setPage(next);
    router.replace(`/shops/${slug}?page=${next}`, { scroll: false });
  }

  return (
    <section className="mt-12 border-t border-border pt-10">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-display text-2xl">Products</h2>
        {flatShippingCents > 0 ? (
          <p className="text-sm text-subtle">
            Flat shipping <Price cents={flatShippingCents} />
          </p>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-danger">{error}</p> : null}

      {loading ? <ProductGridSkeleton count={6} cols={3} /> : null}

      {!loading && products.length === 0 ? (
        <p className="mt-4 text-muted">No active products yet.</p>
      ) : null}

      {!loading && products.length > 0 ? (
        <div className="relative mt-6">
          {refreshing ? <LoadingOverlay label="Updating products…" /> : null}
          <div
            className={`grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 ${
              refreshing ? 'pointer-events-none opacity-60' : ''
            }`}
          >
            {products.map((p) => (
              <ProductCard
                key={p.id}
                href={`/shops/${slug}/products/${p.slug}`}
                title={p.title}
                imageUrl={p.media[0]?.url}
                imageAlt={p.media[0]?.alt}
                priceCents={p.variants[0]?.priceCents ?? 0}
                currency={p.variants[0]?.currency ?? 'USD'}
              />
            ))}
          </div>
        </div>
      ) : null}

      <PaginationControls page={page} limit={limit} total={total} onPageChange={onPageChange} />
    </section>
  );
}
