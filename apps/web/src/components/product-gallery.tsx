'use client';

import { useState } from 'react';

type Media = { url: string; alt: string };

export function ProductGallery({ media, title }: { media: Media[]; title: string }) {
  const [active, setActive] = useState(0);
  const current = media[Math.min(active, Math.max(media.length - 1, 0))];

  if (!current) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center rounded-lg bg-background-subtle text-subtle">
        No image
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[4/5] overflow-hidden rounded-lg bg-background-subtle">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.alt || title}
          className="h-full w-full object-cover"
        />
      </div>
      {media.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {media.map((m, i) => (
            <button
              key={`${m.url}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${
                i === active ? 'border-accent' : 'border-transparent'
              }`}
              aria-label={`Show image ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
