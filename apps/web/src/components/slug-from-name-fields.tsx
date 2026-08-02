'use client';

import { Input } from '@crafthub/ui';
import { toSlug } from '@/lib/slug';

type Props = {
  sourceLabel: string;
  sourceValue: string;
  onSourceChange: (value: string) => void;
  slug: string;
  onSlugChange: (slug: string) => void;
  slugManual: boolean;
  onSlugManualChange: (manual: boolean) => void;
  sourceRequired?: boolean;
  slugHint?: string;
};

/** Source field + slug that auto-updates until the user edits the slug. */
export function SlugFromNameFields({
  sourceLabel,
  sourceValue,
  onSourceChange,
  slug,
  onSlugChange,
  slugManual,
  onSlugManualChange,
  sourceRequired,
  slugHint = 'Used in the public URL',
}: Props) {
  const suggested = toSlug(sourceValue);

  return (
    <>
      <Input
        label={sourceLabel}
        required={sourceRequired}
        value={sourceValue}
        onChange={(e) => {
          const next = e.target.value;
          onSourceChange(next);
          if (!slugManual) onSlugChange(toSlug(next));
        }}
      />
      <div className="flex flex-col gap-1.5">
        <Input
          label="Slug"
          hint={slugHint}
          required={sourceRequired}
          value={slug}
          onChange={(e) => {
            onSlugManualChange(true);
            onSlugChange(toSlug(e.target.value));
          }}
        />
        {slugManual && suggested && suggested !== slug ? (
          <button
            type="button"
            className="self-start text-sm text-accent hover:underline"
            onClick={() => {
              onSlugChange(suggested);
              onSlugManualChange(false);
            }}
          >
            Use suggested: {suggested}
          </button>
        ) : (
          <p className="text-xs text-subtle">
            {slugManual
              ? 'Slug unlocked — edit freely, or use the suggestion above.'
              : 'Slug updates automatically from the name. Edit to customize.'}
          </p>
        )}
      </div>
    </>
  );
}
