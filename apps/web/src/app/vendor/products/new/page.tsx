'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Textarea } from '@crafthub/ui';
import { Page } from '@/components/page';
import { SlugFromNameFields } from '@/components/slug-from-name-fields';
import { SuggestCategoryPanel } from '@/components/suggest-category-panel';
import {
  addProductMedia,
  createVendorProduct,
  fetchCategories,
  generateListingDraft,
} from '@/lib/api';
import { toSlug } from '@/lib/slug';

function dollarsToCents(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>(
    [],
  );
  const [notes, setNotes] = useState('');
  const [copilotBusy, setCopilotBusy] = useState(false);
  const [copilotNote, setCopilotNote] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priceDollars, setPriceDollars] = useState('25');
  const [stockQty, setStockQty] = useState('10');
  const [sku, setSku] = useState('');
  const [imageUrls, setImageUrls] = useState('');
  const [status, setStatus] = useState<'draft' | 'active'>('draft');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => undefined);
  }, []);

  async function onGenerateDraft() {
    setCopilotBusy(true);
    setCopilotNote(null);
    setError(null);
    try {
      const { draft, meta } = await generateListingDraft({
        notes,
        titleHint: title || undefined,
        categoryHint: categories.find((c) => c.id === categoryId)?.name,
      });
      setTitle(draft.title);
      if (!slugManual) setSlug(toSlug(draft.title));
      const care = draft.materialCare ? `\n\nCare: ${draft.materialCare}` : '';
      const tags =
        draft.tags.length > 0 ? `\n\nTags: ${draft.tags.map((t) => `#${t}`).join(' ')}` : '';
      setDescription(`${draft.description}${care}${tags}`.trim());
      if (draft.categoryId) setCategoryId(draft.categoryId);
      const warnings =
        draft.moderationWarnings.length > 0
          ? ` Warnings: ${draft.moderationWarnings.join('; ')}.`
          : '';
      setCopilotNote(
        `Draft filled — review everything before saving.${meta.mock ? ' (mock AI)' : ''}${warnings}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate draft');
    } finally {
      setCopilotBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === 'active' && !categoryId) {
      setError('Active products require a category');
      return;
    }
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
            priceCents: dollarsToCents(priceDollars),
            currency: 'USD',
            stockQty: Number(stockQty),
            attributes: {},
          },
        ],
      });
      const urls = imageUrls
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);
      for (const url of urls) {
        await addProductMedia(product.id, { url, alt: title });
      }
      router.push(`/vendor/products/${product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page size="reading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/vendor/products" className="text-sm text-accent hover:underline">
            ← Products
          </Link>
          <h1 className="mt-2 font-display text-3xl">New product</h1>
          <p className="mt-1 text-sm text-muted">
            Create a draft first, or publish when category and details are ready.
          </p>
        </div>
      </div>

      <section className="mt-8 rounded-md border border-border bg-elevated/40 p-5">
        <h2 className="font-display text-lg">Listing copilot</h2>
        <p className="mt-1 text-sm text-muted">
          Paste rough notes and generate a draft. AI never auto-publishes.
        </p>
        <div className="mt-4">
          <Textarea
            label="Notes"
            placeholder="e.g. Hand-thrown speckled mug, holds 10oz, matte glaze, ships from Islamabad…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-24"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={copilotBusy || notes.trim().length < 8}
            onClick={() => void onGenerateDraft()}
          >
            {copilotBusy ? 'Generating…' : 'Generate listing'}
          </Button>
          {copilotNote ? <p className="text-sm text-muted">{copilotNote}</p> : null}
        </div>
      </section>

      <form onSubmit={onSubmit} className="mt-8 space-y-8">
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-lg">Details</h2>
            <p className="mt-1 text-sm text-muted">Title, URL, description, and craft.</p>
          </div>
          <SlugFromNameFields
            sourceLabel="Title"
            sourceValue={title}
            onSourceChange={setTitle}
            slug={slug}
            onSlugChange={setSlug}
            slugManual={slugManual}
            onSlugManualChange={setSlugManual}
            sourceRequired
            slugHint="Used in the product URL"
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What it’s made of, size, care, and what makes it special…"
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
          <div>
            <h2 className="font-display text-lg">Pricing & stock</h2>
            <p className="mt-1 text-sm text-muted">One default variant for now.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Price (USD)"
              type="number"
              min={0}
              step="0.01"
              required
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              hint="Stored as cents on the server"
            />
            <Input
              label="Stock"
              type="number"
              min={0}
              step="1"
              required
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
            />
            <Input label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} hint="Optional" />
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-8">
          <div>
            <h2 className="font-display text-lg">Images</h2>
            <p className="mt-1 text-sm text-muted">Paste image URLs for now — edit more after create.</p>
          </div>
          <Textarea
            label="Image URLs"
            hint="One URL per line"
            className="min-h-24"
            placeholder={'https://…\nhttps://…'}
            value={imageUrls}
            onChange={(e) => setImageUrls(e.target.value)}
          />
        </section>

        <section className="space-y-4 border-t border-border pt-8">
          <div>
            <h2 className="font-display text-lg">Publish</h2>
            <p className="mt-1 text-sm text-muted">Drafts stay private until you set Active.</p>
          </div>
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'active')}
          >
            <option value="draft">Draft — not public</option>
            <option value="active">Active — visible on CraftHub</option>
          </Select>
          {error ? <p className="text-danger">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={loading}>
              Create product
            </Button>
            <Link href="/vendor/products">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
          </div>
        </section>
      </form>
    </Page>
  );
}
