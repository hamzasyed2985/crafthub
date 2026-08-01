'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@crafthub/ui';
import { fetchCategories, fetchProducts, type ProductDto } from '@/lib/api';

export default function ExplorePage() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>(
    [],
  );
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (q) params.q = q;
    if (category) params.category = category;
    fetchProducts(params)
      .then((res) => {
        setProducts(res.data);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [q, category]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-3xl">Explore makers</h1>
      <p className="mt-1 text-muted">Browse handmade goods from approved CraftHub shops.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          className="min-h-11 flex-1 rounded-sm border border-border-strong bg-elevated px-3 text-foreground"
          placeholder="Search products…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="min-h-11 rounded-sm border border-border-strong bg-elevated px-3 text-foreground"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="mt-6 text-danger">{error}</p> : null}
      {loading ? <p className="mt-6 text-subtle">Loading…</p> : null}

      {!loading && products.length === 0 ? (
        <p className="mt-10 text-muted">No products yet. Approve a vendor and publish a listing.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
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
    </div>
  );
}
