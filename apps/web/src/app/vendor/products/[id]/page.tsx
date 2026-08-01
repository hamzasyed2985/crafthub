'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { Button, Input } from '@crafthub/ui';
import {
  addProductMedia,
  fetchVendorProducts,
  updateVendorProduct,
  type ProductDto,
} from '@/lib/api';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDto | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceCents, setPriceCents] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('draft');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVendorProducts()
      .then((list) => {
        const p = list.find((x) => x.id === params.id);
        if (!p) throw new Error('Product not found');
        setProduct(p);
        setTitle(p.title);
        setDescription(p.description);
        setPriceCents(String(p.variants[0]?.priceCents ?? 0));
        setStockQty(String(p.variants[0]?.stockQty ?? 0));
        setStatus(p.status);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, [params.id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!product) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateVendorProduct(product.id, {
        title,
        description,
        status,
        variants: [
          {
            sku: product.variants[0]?.sku ?? null,
            priceCents: Number(priceCents),
            currency: product.variants[0]?.currency ?? 'USD',
            stockQty: Number(stockQty),
            attributes: product.variants[0]?.attributes ?? {},
          },
        ],
      });
      if (imageUrl) {
        await addProductMedia(product.id, { url: imageUrl, alt: title });
        setImageUrl('');
      }
      setProduct(updated);
      setMessage('Saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  if (error && !product) {
    return <p className="px-6 py-12 text-danger">{error}</p>;
  }
  if (!product) return <p className="px-6 py-12 text-subtle">Loading…</p>;

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="font-display text-3xl">Edit product</h1>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Description</span>
          <textarea
            className="min-h-28 rounded-sm border border-border-strong bg-elevated px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <Input
          label="Price (cents)"
          type="number"
          value={priceCents}
          onChange={(e) => setPriceCents(e.target.value)}
        />
        <Input
          label="Stock"
          type="number"
          value={stockQty}
          onChange={(e) => setStockQty(e.target.value)}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Status</span>
          <select
            className="min-h-11 rounded-sm border border-border-strong bg-elevated px-3"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <Input
          label="Add image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        {product.media.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto">
            {product.media.map((m) => (
              <img key={m.id} src={m.url} alt={m.alt} className="h-20 w-20 rounded object-cover" />
            ))}
          </div>
        ) : null}
        {error ? <p className="text-danger">{error}</p> : null}
        {message ? <p className="text-success">{message}</p> : null}
        <Button type="submit" loading={loading}>
          Save
        </Button>
      </form>
    </div>
  );
}
