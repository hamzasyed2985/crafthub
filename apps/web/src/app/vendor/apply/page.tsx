'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@crafthub/ui';
import { applyVendor } from '@/lib/api';

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function VendorApplyPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [craftTags, setCraftTags] = useState('pottery');
  const [attestation, setAttestation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!attestation) {
      setError('Confirm you make what you sell.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await applyVendor({
        displayName,
        slug: slug || toSlug(displayName),
        city,
        bio: bio || undefined,
        craftTags: craftTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        attestation: true,
      });
      router.push('/vendor/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apply failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="font-display text-3xl">Sell on CraftHub</h1>
      <p className="mt-2 text-muted">
        Apply as a maker. An admin reviews your shop before it goes public.
      </p>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          label="Shop name"
          required
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            if (!slug) setSlug(toSlug(e.target.value));
          }}
        />
        <Input
          label="Shop slug"
          hint="Used in /shops/your-slug"
          required
          value={slug}
          onChange={(e) => setSlug(toSlug(e.target.value))}
        />
        <Input label="City" required value={city} onChange={(e) => setCity(e.target.value)} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Bio</span>
          <textarea
            className="min-h-28 rounded-sm border border-border-strong bg-elevated px-3 py-2"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </label>
        <Input
          label="Craft tags"
          hint="Comma-separated"
          value={craftTags}
          onChange={(e) => setCraftTags(e.target.value)}
        />
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={attestation}
            onChange={(e) => setAttestation(e.target.checked)}
            className="mt-1"
          />
          <span>I make what I sell (no mass-produced dropshipping).</span>
        </label>
        {error ? <p className="text-danger">{error}</p> : null}
        <Button type="submit" loading={loading}>
          Submit application
        </Button>
      </form>
    </div>
  );
}
