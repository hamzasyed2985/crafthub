'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@crafthub/ui';
import { Page } from '@/components/page';
import {
  fetchVendorMe,
  fetchVendorProducts,
  openVendorStripeManage,
  refreshVendorStripe,
  startVendorStripeOnboard,
} from '@/lib/api';
import { formatStatusLabel } from '@/lib/format-status';
import {
  isStripeConnected,
  stripeStatusMessage,
  type VendorStripeFlags,
} from '@/lib/stripe-status';

export default function VendorOnboardingPage() {
  const [vendor, setVendor] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripeBusy, setStripeBusy] = useState(false);
  const [stripeMsg, setStripeMsg] = useState<string | null>(null);
  const [hasPublishedProduct, setHasPublishedProduct] = useState(false);

  async function load() {
    const v = await fetchVendorMe();
    setVendor(v);

    if (v.status === 'approved') {
      try {
        const res = await fetchVendorProducts({ status: 'active', limit: '1' });
        setHasPublishedProduct(res.meta.total > 0 || res.data.some((p) => p.status === 'active'));
      } catch {
        setHasPublishedProduct(false);
      }
    } else {
      setHasPublishedProduct(false);
    }

    return v;
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));

    const params = new URLSearchParams(window.location.search);
    const stripeParam = params.get('stripe');
    const mockReturn =
      params.get('mock_onboard') === '1' ||
      params.get('mock_update') === '1' ||
      params.get('mock_dashboard') === '1';

    if (stripeParam === 'return' || mockReturn) {
      setStripeBusy(true);
      refreshVendorStripe()
        .then(async (data) => {
          await load();
          if (data.chargesEnabled && data.onboardingComplete) {
            setStripeMsg('Connected — your Stripe payout account is linked.');
          } else {
            setStripeMsg('Stripe setup incomplete — finish the remaining steps.');
          }
        })
        .catch((err) => setStripeMsg(err instanceof Error ? err.message : 'Refresh failed'))
        .finally(() => setStripeBusy(false));
    } else if (stripeParam === 'refresh') {
      setStripeBusy(true);
      startVendorStripeOnboard()
        .then((data) => {
          if (data.url) window.location.href = data.url;
        })
        .catch((err) => setStripeMsg(err instanceof Error ? err.message : 'Could not reopen Stripe'))
        .finally(() => setStripeBusy(false));
    }
  }, []);

  async function connectStripe() {
    setStripeBusy(true);
    setStripeMsg(null);
    try {
      const data = await startVendorStripeOnboard();
      if (data.stripe.chargesEnabled && data.stripe.onboardingComplete) {
        await load();
        setStripeMsg('Connected — Stripe payout account is ready.');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      setStripeMsg(err instanceof Error ? err.message : 'Stripe connect failed');
    } finally {
      setStripeBusy(false);
    }
  }

  async function manageStripe(action: 'update' | 'dashboard') {
    setStripeBusy(true);
    setStripeMsg(null);
    try {
      const data = await openVendorStripeManage(action);
      window.location.href = data.url;
    } catch (err) {
      setStripeMsg(err instanceof Error ? err.message : 'Could not open Stripe');
      setStripeBusy(false);
    }
  }

  if (error) {
    return (
      <Page size="narrow">
        <p className="text-danger">{error}</p>
        <Link href="/vendor/apply" className="text-accent">
          Apply first
        </Link>
      </Page>
    );
  }

  if (!vendor) {
    return (
      <Page size="narrow">
        <p className="text-subtle">Loading…</p>
      </Page>
    );
  }

  const status = String(vendor.status);
  const stripe = vendor.stripe as VendorStripeFlags | null | undefined;
  const connected = isStripeConnected(stripe);
  const shop = vendor.shop as {
    shippingPolicy?: string | null;
    returnsPolicy?: string | null;
  } | null;
  const brandingDone = Boolean(
    shop?.shippingPolicy?.trim() &&
      shop?.returnsPolicy?.trim() &&
      (String(vendor.bannerUrl ?? '').trim() || String(vendor.logoUrl ?? '').trim()),
  );

  const steps = [
    { label: 'Submit application', done: true },
    { label: 'Admin approval', done: status === 'approved' },
    {
      label: 'Shop branding & policies',
      done: brandingDone,
      href: '/vendor/shop',
      note: brandingDone
        ? 'Logo/banner and shipping + returns policies are set'
        : 'Add a logo or banner plus shipping and returns policies',
    },
    {
      label: 'Stripe Connect',
      done: connected,
      note: stripeStatusMessage(stripe),
    },
    {
      label: 'Publish first product',
      done: hasPublishedProduct,
      href: hasPublishedProduct ? '/vendor/products' : '/vendor/products/new',
      note: hasPublishedProduct
        ? 'You have at least one active listing'
        : status === 'approved'
          ? 'Add an active product so buyers can find your work'
          : 'Requires approval',
    },
  ];

  return (
    <Page size="narrow">
      <h1 className="font-display text-3xl">Onboarding</h1>
      <p className="mt-2 text-muted">
        Status: <strong>{formatStatusLabel(status)}</strong>
        {status === 'pending' ? ' — hang tight while CraftHub reviews your shop.' : null}
      </p>

      {status === 'approved' && connected ? (
        <div className="mt-6 rounded-md border border-success/30 bg-success/10 px-4 py-3">
          <p className="font-semibold text-success">Stripe Connected</p>
          <p className="mt-1 text-sm text-muted">
            Charges {stripe?.chargesEnabled ? 'on' : 'off'} · Payouts{' '}
            {stripe?.payoutsEnabled ? 'on' : 'off'}
            {stripe?.onboardingComplete ? ' · Details submitted' : ''}
          </p>
        </div>
      ) : null}

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
              <p className="font-semibold">
                {step.label}
                {step.label === 'Stripe Connect' && connected ? (
                  <span className="ml-2 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                    Connected
                  </span>
                ) : null}
              </p>
              {step.note ? <p className="text-sm text-subtle">{step.note}</p> : null}
              {step.href && status === 'approved' ? (
                <Link href={step.href} className="text-sm text-accent">
                  Open
                </Link>
              ) : null}

              {step.label === 'Stripe Connect' && status === 'approved' && !connected ? (
                <div className="mt-2">
                  <Button size="sm" disabled={stripeBusy} onClick={() => void connectStripe()}>
                    {stripeBusy ? 'Connecting…' : 'Connect with Stripe'}
                  </Button>
                </div>
              ) : null}

              {step.label === 'Stripe Connect' && status === 'approved' && connected ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={stripeBusy}
                    onClick={() => void manageStripe('update')}
                  >
                    Update payout details
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={stripeBusy}
                    onClick={() => void manageStripe('dashboard')}
                  >
                    Open Stripe dashboard
                  </Button>
                  <button
                    type="button"
                    className="self-center text-sm text-accent"
                    disabled={stripeBusy}
                    onClick={() => {
                      setStripeBusy(true);
                      refreshVendorStripe()
                        .then(() => load())
                        .then(() => setStripeMsg('Stripe status refreshed.'))
                        .catch((err) =>
                          setStripeMsg(err instanceof Error ? err.message : 'Refresh failed'),
                        )
                        .finally(() => setStripeBusy(false));
                    }}
                  >
                    Refresh status
                  </button>
                </div>
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
    </Page>
  );
}
