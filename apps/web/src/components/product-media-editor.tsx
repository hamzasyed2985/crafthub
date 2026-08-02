'use client';

import { useState } from 'react';
import { Button, Input } from '@crafthub/ui';
import { addProductMedia, deleteProductMedia } from '@/lib/api';

export type MediaItem = {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
};

type Props = {
  productId: string;
  media: MediaItem[];
  onChange: (media: MediaItem[]) => void;
  defaultAlt?: string;
};

export function ProductMediaEditor({ productId, media, onChange, defaultAlt = '' }: Props) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function onAdd() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await addProductMedia(productId, { url: trimmed, alt: defaultAlt });
      onChange([...media, res.data.media]);
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add image');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(mediaId: string) {
    setRemovingId(mediaId);
    setError(null);
    try {
      await deleteProductMedia(productId, mediaId);
      onChange(media.filter((m) => m.id !== mediaId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove image');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold">Product images</span>
      {media.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {media.map((m, i) => (
            <li key={m.id} className="relative overflow-hidden rounded-md border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.alt || `Image ${i + 1}`} className="aspect-square w-full object-cover" />
              <button
                type="button"
                className="absolute inset-x-0 bottom-0 bg-black/75 px-1 py-1 text-xs text-white disabled:opacity-50"
                disabled={removingId === m.id}
                onClick={() => void onRemove(m.id)}
              >
                {removingId === m.id ? '…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-subtle">No images yet. Add one or more URLs below.</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Image URL"
            hint="Paste a public image URL (multiple allowed)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <Button type="button" variant="secondary" loading={busy} disabled={!url.trim()} onClick={() => void onAdd()}>
          Add image
        </Button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
