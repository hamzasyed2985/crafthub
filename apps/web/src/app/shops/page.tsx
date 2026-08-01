'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchShops } from '@/lib/api';

type ShopRow = Awaited<ReturnType<typeof fetchShops>>['data'][number];

export default function ShopsPage() {
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (q) params.q = q;
    fetchShops(params)
      .then((res) => {
        setShops(res.data);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, [q]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-3xl">Makers</h1>
      <p className="mt-1 text-muted">Independent artisans with shops on CraftHub.</p>
      <input
        className="mt-6 min-h-11 w-full max-w-md rounded-sm border border-border-strong bg-elevated px-3"
        placeholder="Search makers…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {error ? <p className="mt-4 text-danger">{error}</p> : null}
      <ul className="mt-8 divide-y divide-border">
        {shops.map((s) => (
          <li key={s.id} className="py-5">
            <Link href={`/shops/${s.slug}`} className="flex items-start gap-4 hover:opacity-90">
              {s.logoUrl ? (
                <img src={s.logoUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-muted font-display text-lg text-accent">
                  {s.displayName.slice(0, 1)}
                </div>
              )}
              <div>
                <p className="font-display text-xl">{s.displayName}</p>
                <p className="text-sm text-muted">{s.city}</p>
                {s.bio ? <p className="mt-1 line-clamp-2 text-subtle">{s.bio}</p> : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
