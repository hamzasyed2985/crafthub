'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Input, Select, Textarea } from '@crafthub/ui';
import { PageLoader } from '@/components/page-loader';
import { Page } from '@/components/page';
import { ProductMediaEditor } from '@/components/product-media-editor';
import { SuggestCategoryPanel } from '@/components/suggest-category-panel';
import {
  fetchCategories,
  fetchVendorProduct,
  updateVendorProduct,
  type ProductDto,
} from '@/lib/api';

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

function dollarsToCents(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDto | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>(
    [],
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priceDollars, setPriceDollars] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('draft');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => undefined);
  }, []);

  useEffect(() => {
    fetchVendorProduct(params.id)
      .then((p) => {
        setProduct(p);
        setTitle(p.title);
        setDescription(p.description);
        setCategoryId(p.category?.id ?? '');
        setPriceDollars(centsToDollars(p.variants[0]?.priceCents ?? 0));
        setStockQty(String(p.variants[0]?.stockQty ?? 0));
        setStatus(p.status);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, [params.id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!product) return;
    if (status === 'active' && !categoryId) {
      setError('Active products require a category');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateVendorProduct(product.id, {
        title,
        description,
        categoryId: categoryId || null,
        status,
        variants: [
          {
            sku: product.variants[0]?.sku ?? null,
            priceCents: dollarsToCents(priceDollars),
            currency: product.variants[0]?.currency ?? 'USD',
            stockQty: Number(stockQty),
            attributes: product.variants[0]?.attributes ?? {},
          },
        ],
      });
      setProduct({ ...updated, media: product.media });
      setCategoryId(updated.category?.id ?? '');
      setMessage('Saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  if (error && !product) {
    return (
      <Page size="reading">
        <p className="text-danger">{error}</p>
      </Page>
    );
  }
  if (!product)
    return (
      <Page size="reading">
        <PageLoader />
      </Page>
    );

  return (
    <Page size="reading">
      <Link href="/vendor/products" className="text-sm text-accent hover:underline">
        ← Products
      </Link>
      <h1 className="mt-2 font-display text-3xl">Edit product</h1>
      <p className="mt-1 text-sm text-muted">{product.slug}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-8">
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-lg">Details</h2>
          </div>
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Select
            label={status === 'active' ? 'Category (required)' : 'Category'}
            hint="Active listings need a craft category."
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required={status === 'active'}
          >
            <option value="">{status === 'active' ? 'Select a craft…' : 'None (draft only)'}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <SuggestCategoryPanel />
        </section>

        <section className="space-y-4 border-t border-border pt-8">
          <h2 className="font-display text-lg">Pricing & stock</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Price (USD)"
              type="number"
              min={0}
              step="0.01"
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
            />
            <Input
              label="Stock"
              type="number"
              min={0}
              step="1"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
            />
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-8">
          <h2 className="font-display text-lg">Images</h2>
          <ProductMediaEditor
            productId={product.id}
            media={product.media}
            onChange={(media) => setProduct({ ...product, media })}
            defaultAlt={title}
          />
        </section>

        <section className="space-y-4 border-t border-border pt-8">
          <h2 className="font-display text-lg">Publish</h2>
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="draft">Draft — not public</option>
            <option value="active">Active — visible on CraftHub</option>
            <option value="archived">Archived</option>
          </Select>
          {error ? <p className="text-danger">{error}</p> : null}
          {message ? <p className="text-sm text-muted">{message}</p> : null}
          <Button type="submit" loading={loading}>
            Save changes
          </Button>
        </section>
      </form>
    </Page>
  );
}
