'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Input } from '@crafthub/ui';
import { PageLoader } from '@/components/page-loader';
import { Page } from '@/components/page';
import { CitySelect, CountrySelect } from '@/components/country-city-fields';
import { fetchVendorMe, updateVendorShop } from '@/lib/api';
import { countryForCity } from '@/lib/locations';

export default function VendorShopPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [country, setCountry] = useState('PK');
  const [shipsCountry, setShipsCountry] = useState('PK');
  const [form, setForm] = useState({
    displayName: '',
    bio: '',
    city: '',
    logoUrl: '',
    bannerUrl: '',
    shippingPolicy: '',
    returnsPolicy: '',
    flatShippingCents: '500',
    shipsFromCity: '',
  });

  useEffect(() => {
    fetchVendorMe()
      .then((v) => {
        const shop = (v.shop ?? {}) as Record<string, unknown>;
        const city = String(v.city ?? '');
        const shipsFromCity = String(shop.shipsFromCity ?? '');
        setCountry(countryForCity(city));
        setShipsCountry(countryForCity(shipsFromCity || city));
        setForm({
          displayName: String(v.displayName ?? ''),
          bio: String(v.bio ?? ''),
          city,
          logoUrl: String(v.logoUrl ?? ''),
          bannerUrl: String(v.bannerUrl ?? ''),
          shippingPolicy: String(shop.shippingPolicy ?? ''),
          returnsPolicy: String(shop.returnsPolicy ?? ''),
          flatShippingCents: String(shop.flatShippingCents ?? 500),
          shipsFromCity,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateVendorShop({
        displayName: form.displayName,
        bio: form.bio,
        city: form.city,
        logoUrl: form.logoUrl || null,
        bannerUrl: form.bannerUrl || null,
        shippingPolicy: form.shippingPolicy || null,
        returnsPolicy: form.returnsPolicy || null,
        flatShippingCents: Number(form.flatShippingCents) || 0,
        shipsFromCity: form.shipsFromCity || null,
      });
      setMessage('Shop updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <Page size="narrow">
        <PageLoader />
      </Page>
    );

  return (
    <Page size="narrow">
      <h1 className="font-display text-3xl">Shop settings</h1>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          label="Display name"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
        />
        <CountrySelect
          value={country}
          onChange={(code) => {
            setCountry(code);
            setForm((f) => ({ ...f, city: '' }));
          }}
        />
        <CitySelect
          countryCode={country}
          value={form.city}
          extraOptions={form.city ? [form.city] : []}
          onChange={(city) => setForm({ ...form, city })}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Bio</span>
          <textarea
            className="min-h-28 rounded-sm border border-border-strong bg-elevated px-3 py-2"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </label>
        <Input
          label="Logo URL"
          value={form.logoUrl}
          onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
        />
        <Input
          label="Banner URL"
          value={form.bannerUrl}
          onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })}
        />
        <CountrySelect
          id="ships-country"
          label="Ships from country"
          value={shipsCountry}
          onChange={(code) => {
            setShipsCountry(code);
            setForm((f) => ({ ...f, shipsFromCity: '' }));
          }}
        />
        <CitySelect
          id="ships-city"
          label="Ships from city"
          countryCode={shipsCountry}
          value={form.shipsFromCity}
          extraOptions={form.shipsFromCity ? [form.shipsFromCity] : []}
          onChange={(shipsFromCity) => setForm({ ...form, shipsFromCity })}
        />
        <Input
          label="Flat shipping (cents)"
          type="number"
          value={form.flatShippingCents}
          onChange={(e) => setForm({ ...form, flatShippingCents: e.target.value })}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Shipping policy</span>
          <textarea
            className="min-h-24 rounded-sm border border-border-strong bg-elevated px-3 py-2"
            value={form.shippingPolicy}
            onChange={(e) => setForm({ ...form, shippingPolicy: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Returns policy</span>
          <textarea
            className="min-h-24 rounded-sm border border-border-strong bg-elevated px-3 py-2"
            value={form.returnsPolicy}
            onChange={(e) => setForm({ ...form, returnsPolicy: e.target.value })}
          />
        </label>
        {error ? <p className="text-danger">{error}</p> : null}
        {message ? <p className="text-success">{message}</p> : null}
        <Button type="submit" loading={saving}>
          Save
        </Button>
      </form>
    </Page>
  );
}
