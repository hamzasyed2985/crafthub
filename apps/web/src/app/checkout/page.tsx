'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Price } from '@crafthub/ui';
import { Page } from '@/components/page';
import { useCart } from '@/components/cart-provider';
import { CitySelect, CountrySelect } from '@/components/country-city-fields';
import { createCheckoutSession, fetchMe, readAccessToken } from '@/lib/api';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, loading, refresh } = useCart();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    line1: '',
    line2: '',
    city: '',
    region: '',
    postalCode: '',
    country: 'PK',
  });

  useEffect(() => {
    if (!readAccessToken()) {
      setAuthed(false);
      return;
    }
    fetchMe()
      .then((me) => {
        setAuthed(true);
        if (me.user.name) setForm((f) => ({ ...f, name: me.user.name ?? '' }));
      })
      .catch(() => setAuthed(false));
    void refresh();
  }, [refresh]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await createCheckoutSession({
        shipping: {
          name: form.name,
          line1: form.line1,
          line2: form.line2 || null,
          city: form.city,
          region: form.region || null,
          postalCode: form.postalCode,
          country: form.country || 'US',
        },
        idempotencyKey:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `chk-${Date.now()}`,
      });
      window.location.href = result.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setSubmitting(false);
    }
  }

  if (authed === false) {
    return (
      <Page size="narrow" y="lg" className="text-center">
        <h1 className="font-display text-3xl">Sign in to checkout</h1>
        <p className="mt-3 text-muted">Checkout requires an account so we can attach your order.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href={`/login?next=/checkout`}>
            <Button>Log in</Button>
          </Link>
          <Link href={`/register?next=/checkout`}>
            <Button variant="secondary">Create account</Button>
          </Link>
        </div>
      </Page>
    );
  }

  if (authed === null || (loading && !cart)) {
    return (
      <Page size="default">
        <p className="text-subtle">Loading checkout…</p>
      </Page>
    );
  }

  if (!cart || cart.itemCount === 0) {
    return (
      <Page size="narrow" y="lg" className="text-center">
        <h1 className="font-display text-3xl">Nothing to checkout</h1>
        <Link href="/explore" className="mt-6 inline-block text-accent">
          Explore makers
        </Link>
      </Page>
    );
  }

  return (
    <Page size="default" className="grid gap-10 lg:grid-cols-2">
      <div>
        <h1 className="font-display text-3xl">Checkout</h1>
        <p className="mt-2 text-muted">Shipping address for this order.</p>
        <form className="mt-8 space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <Input
            label="Full name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Address line 1"
            required
            value={form.line1}
            onChange={(e) => setForm({ ...form, line1: e.target.value })}
          />
          <Input
            label="Address line 2"
            value={form.line2}
            onChange={(e) => setForm({ ...form, line2: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <CountrySelect
              value={form.country}
              required
              onChange={(country) => setForm({ ...form, country, city: '' })}
            />
            <CitySelect
              countryCode={form.country}
              value={form.city}
              required
              onChange={(city) => setForm({ ...form, city })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Region / state"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
            />
            <Input
              label="Postal code"
              required
              value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Starting payment…' : 'Pay with Stripe'}
          </Button>
          <button
            type="button"
            className="w-full text-sm text-subtle"
            onClick={() => router.push('/cart')}
          >
            Back to cart
          </button>
        </form>
      </div>

      <aside className="rounded-md border border-border bg-elevated p-5 h-fit">
        <h2 className="font-display text-xl">Order summary</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {cart.groups.map((g) => (
            <li key={g.vendor.id}>
              <p className="font-semibold">{g.vendor.displayName}</p>
              {g.items.map((item) => (
                <p key={item.id} className="flex justify-between text-muted">
                  <span>
                    {item.quantity}× {item.product.title}
                  </span>
                  <Price cents={item.lineTotalCents} />
                </p>
              ))}
              <p className="flex justify-between text-muted">
                <span>Shipping</span>
                <Price cents={g.shippingCents} />
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-6 space-y-1 border-t border-border pt-4">
          <div className="flex justify-between text-muted">
            <span>Items</span>
            <Price cents={cart.itemsSubtotalCents} />
          </div>
          <div className="flex justify-between text-muted">
            <span>Shipping</span>
            <Price cents={cart.shippingTotalCents} />
          </div>
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <Price cents={cart.totalCents} />
          </div>
        </div>
      </aside>
    </Page>
  );
}
