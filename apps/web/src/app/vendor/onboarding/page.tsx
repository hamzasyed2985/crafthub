'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@crafthub/ui';
import {
  fetchVendorMe,
  refreshVendorStripe,
  startVendorStripeOnboard,
} from '@/lib/api';

export default function VendorOnboardingPage() {
  const [vendor, setVendor] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripeBusy, setStripeBusy] = useState(false);
  const [stripeMsg, setStripeMsg] = useState<string | null>(null);

  async function load() {
    const v = await fetchVendorMe();
    setVendor(v);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));

    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe') === 'return' || params.get('mock_onboard') === '1') {
      setStripeBusy(true);
      refreshVendorStripe()
        .then(() => load())
        .then(() => setStripeMsg('Stripe account status refreshed.'))
        .catch((err) => setStripeMsg(err instanceof Error ? err.message : 'Refresh failed'))
        .finally(() => setStripeBusy(false));
    }
  }, []);

  async function connectStripe() {
    setStripeBusy(true);
    setStripeMsg(null);
    try {
      const data = await startVendorStripeOnboard();
      if (data.stripe.chargesEnabled) {
        await load();
        setStripeMsg('Stripe Connect ready (charges enabled).');
      }
      if (data.url && !data.stripe.chargesEnabled) {
        window.location.href = data.url;
        return;
      }
      // Mock mode already enabled flags — optional redirect still ok
      if (data.url.includes('mock_onboard=1')) {
        await load();
        setStripeMsg('Mock Stripe onboarding complete.');
      }
    } catch (err) {
      setStripeMsg(err instanceof Error ? err.message : 'Stripe onboard failed');
    } finally {
      setStripeBusy(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-12">
        <p className="text-danger">{error}</p>
        <Link href="/vendor/apply" className="text-accent">
          Apply first
        </Link>
      </div>
    );
  }

  if (!vendor) {
    return <p className="px-6 py-12 text-subtle">Loading…</p>;
  }

  const status = String(vendor.status);
  const stripe = vendor.stripe as
    | {
        chargesEnabled?: boolean;
        payoutsEnabled?: boolean;
        onboardingComplete?: boolean;
        hasAccount?: boolean;
      }
    | null
    | undefined;
  const stripeDone = Boolean(stripe?.chargesEnabled);

  const steps = [
    { label: 'Submit application', done: true },
    { label: 'Admin approval', done: status === 'approved' },
    {
      label: 'Shop branding & policies',
      done: Boolean((vendor.shop as { shippingPolicy?: string } | null)?.shippingPolicy),
      href: '/vendor/shop',
    },
    {
      label: 'Stripe Connect',
      done: stripeDone,
      note: stripeDone
        ? `Charges ${stripe?.chargesEnabled ? 'on' : 'off'} · Payouts ${stripe?.payoutsEnabled ? 'on' : 'off'}`
        : 'Required before buyers can check out your items',
    },
    {
      label: 'Publish first product',
      done: false,
      href: '/vendor/products/new',
      note: 'Requires approval',
    },
  ];

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="font-display text-3xl">Onboarding</h1>
      <p className="mt-2 text-muted">
        Status: <strong>{status}</strong>
        {status === 'pending' ? ' — hang tight while CraftHub reviews your shop.' : null}
      </p>
      <ol className="mt-8 space-y-4">
        {steps.map((step) => (
          <li key={step.label} className="flex items-start gap-3 border-b border-border pb-4">
            <span
              className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                step.done ? 'bg-success text-white' : 'bg-background-subtle text-subtle'
              }`}
            >
              {step.done ? '✓' : '·'}
            </span>
            <div className="flex-1">
              <p className="font-semibold">{step.label}</p>
              {step.note ? <p className="text-sm text-subtle">{step.note}</p> : null}
              {step.href && status === 'approved' ? (
                <Link href={step.href} className="text-sm text-accent">
                  Open
                </Link>
              ) : null}
              {step.label === 'Stripe Connect' && status === 'approved' && !stripeDone ? (
                <div className="mt-2">
                  <Button size="sm" disabled={stripeBusy} onClick={() => void connectStripe()}>
                    {stripeBusy ? 'Connecting…' : 'Connect with Stripe'}
                  </Button>
                </div>
              ) : null}
              {step.label === 'Stripe Connect' && status === 'approved' && stripeDone ? (
                <button
                  type="button"
                  className="mt-1 text-sm text-accent"
                  disabled={stripeBusy}
                  onClick={() => void connectStripe()}
                >
                  Refresh / open dashboard link
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {stripeMsg ? <p className="mt-4 text-sm text-muted">{stripeMsg}</p> : null}
      {status === 'approved' ? (
        <Link href="/vendor" className="mt-8 inline-block text-accent">
          Go to dashboard →
        </Link>
      ) : null}
    </div>
  );
}
