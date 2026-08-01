'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@crafthub/ui';
import { addProductMedia, createVendorProduct, fetchCategories } from '@/lib/api';

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>(
    [],
  );
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priceCents, setPriceCents] = useState('2500');
  const [stockQty, setStockQty] = useState('10');
  const [sku, setSku] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<'draft' | 'active'>('draft');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const product = await createVendorProduct({
        title,
        slug: slug || toSlug(title),
        description,
        categoryId: categoryId || null,
        status,
        variants: [
          {
            sku: sku || null,
            priceCents: Number(priceCents),
            currency: 'USD',
            stockQty: Number(stockQty),
            attributes: {},
          },
        ],
      });
      if (imageUrl) {
        await addProductMedia(product.id, { url: imageUrl, alt: title });
      }
      router.push(`/vendor/products/${product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="font-display text-3xl">New product</h1>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          label="Title"
          required
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slug) setSlug(toSlug(e.target.value));
          }}
        />
        <Input label="Slug" value={slug} onChange={(e) => setSlug(toSlug(e.target.value))} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Description</span>
          <textarea
            className="min-h-28 rounded-sm border border-border-strong bg-elevated px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Category</span>
          <select
            className="min-h-11 rounded-sm border border-border-strong bg-elevated px-3"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Price (cents)"
          type="number"
          required
          value={priceCents}
          onChange={(e) => setPriceCents(e.target.value)}
        />
        <Input
          label="Stock"
          type="number"
          required
          value={stockQty}
          onChange={(e) => setStockQty(e.target.value)}
        />
        <Input label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
        <Input
          label="Image URL"
          hint="Phase 1 uses URLs; R2 uploads come later"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Status</span>
          <select
            className="min-h-11 rounded-sm border border-border-strong bg-elevated px-3"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'active')}
          >
            <option value="draft">Draft</option>
            <option value="active">Active (public)</option>
          </select>
        </label>
        {error ? <p className="text-danger">{error}</p> : null}
        <Button type="submit" loading={loading}>
          Create product
        </Button>
      </form>
    </div>
  );
}
