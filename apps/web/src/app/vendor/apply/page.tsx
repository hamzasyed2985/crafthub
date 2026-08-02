'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@crafthub/ui';
import { Page } from '@/components/page';
import { useAuth } from '@/components/auth-provider';
import { CitySelect, CountrySelect } from '@/components/country-city-fields';
import { SlugFromNameFields } from '@/components/slug-from-name-fields';
import { applyVendor } from '@/lib/api';

export default function VendorApplyPage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [country, setCountry] = useState('PK');
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
    if (displayName.trim().length < 2) {
      setError('Shop name must be at least 2 characters.');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError('Shop slug must be lowercase letters, numbers, and hyphens (e.g. clay-studio).');
      return;
    }
    if (!city.trim()) {
      setError('City is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await applyVendor({
        displayName: displayName.trim(),
        slug: slug.trim(),
        city: city.trim(),
        bio: bio.trim() || undefined,
        craftTags: craftTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        attestation: true,
      });
      await refresh();
      router.push('/vendor/onboarding');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apply failed');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <Page size="narrow">
        <p className="text-subtle">Loading…</p>
      </Page>
    );
  }

  if (!user) {
    return (
      <Page size="narrow">
        <h1 className="font-display text-3xl">Sell on CraftHub</h1>
        <p className="mt-2 text-muted">You need an account before you can apply as a maker.</p>
        <p className="mt-6 rounded-md border border-border bg-accent-muted/40 px-4 py-3 text-sm">
          Log in if you already shop here, or create an account, then submit your shop application.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login?reason=sell&next=/vendor/apply">
            <Button>Log in to apply</Button>
          </Link>
          <Link href="/register?next=/vendor/apply">
            <Button variant="secondary">Create account</Button>
          </Link>
        </div>
      </Page>
    );
  }

  if (user.role === 'vendor') {
    return (
      <Page size="narrow">
        <h1 className="font-display text-3xl">Sell on CraftHub</h1>
        <p className="mt-2 text-muted">You’re already a maker on this account.</p>
        <Link href="/vendor" className="mt-6 inline-block text-accent">
          Go to seller dashboard →
        </Link>
      </Page>
    );
  }

  return (
    <Page size="narrow">
      <h1 className="font-display text-3xl">Sell on CraftHub</h1>
      <p className="mt-2 text-muted">
        Apply as a maker. An admin reviews your shop before it goes public.
      </p>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <SlugFromNameFields
          sourceLabel="Shop name"
          sourceValue={displayName}
          onSourceChange={setDisplayName}
          slug={slug}
          onSlugChange={setSlug}
          slugManual={slugManual}
          onSlugManualChange={setSlugManual}
          sourceRequired
          slugHint="Used in /shops/your-slug"
        />
        <CountrySelect
          value={country}
          required
          onChange={(code) => {
            setCountry(code);
            setCity('');
          }}
        />
        <CitySelect countryCode={country} value={city} required onChange={setCity} />
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
    </Page>
  );
}
