'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@crafthub/ui';
import { Page } from '@/components/page';
import { SlugFromNameFields } from '@/components/slug-from-name-fields';
import {
  addProductMedia,
  createVendorProduct,
  fetchCategories,
  generateListingDraft,
} from '@/lib/api';
import { toSlug } from '@/lib/slug';

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
  const [priceCents, setPriceCents] = useState('2500');
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
    <Page size="narrow">
      <h1 className="font-display text-3xl">New product</h1>
      <p className="mt-2 text-sm text-muted">
        Optional: paste rough notes and generate a draft. AI never auto-publishes.
      </p>

      <div className="mt-6 rounded-md border border-border bg-accent-muted/30 p-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-accent">Listing copilot notes</span>
          <textarea
            className="min-h-24 rounded-sm border border-border-strong bg-elevated px-3 py-2 text-sm"
            placeholder="e.g. Hand-thrown speckled mug, holds 10oz, matte glaze, ships from Islamabad…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
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
      </div>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
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
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Image URLs</span>
          <textarea
            className="min-h-24 rounded-sm border border-border-strong bg-elevated px-3 py-2 text-sm"
            placeholder={'One URL per line\nhttps://…\nhttps://…'}
            value={imageUrls}
            onChange={(e) => setImageUrls(e.target.value)}
          />
          <span className="text-xs text-subtle">You can add or remove more after create.</span>
        </label>
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
    </Page>
  );
}
