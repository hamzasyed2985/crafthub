'use client';

import { useState } from 'react';
import { Button, Input, Textarea } from '@crafthub/ui';
import { suggestCategory } from '@/lib/api';

type Props = {
  className?: string;
};

export function SuggestCategoryPanel({ className }: Props) {
  const [open, setOpen] = useState(false);
  const [proposedName, setProposedName] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit() {
    if (!proposedName.trim()) {
      setError('Enter a proposed craft name');
      return;
    }
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const row = await suggestCategory({ proposedName, note: note || undefined });
      setDone(`Submitted “${row.proposedName}” for admin review.`);
      setProposedName('');
      setNote('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit suggestion');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      {!open ? (
        <button
          type="button"
          className="text-sm text-accent hover:underline"
          onClick={() => setOpen(true)}
        >
          Don’t see your craft? Suggest a category
        </button>
      ) : (
        <div className="space-y-3 rounded-md border border-border bg-background/60 p-4">
          <p className="text-sm text-muted">
            Suggest a new craft for the marketplace. Admins review before it appears in Explore.
          </p>
          <Input
            label="Proposed craft name"
            required
            value={proposedName}
            onChange={(e) => setProposedName(e.target.value)}
            placeholder="e.g. Glasswork"
          />
          <Textarea
            label="Note (optional)"
            className="min-h-20"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What you make and why this craft should be listed"
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" loading={busy} onClick={() => void onSubmit()}>
              Submit suggestion
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {done ? <p className="mt-2 text-sm text-muted">{done}</p> : null}
    </div>
  );
}
