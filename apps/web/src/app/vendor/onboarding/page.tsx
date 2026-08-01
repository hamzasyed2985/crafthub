'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchVendorMe } from '@/lib/api';

export default function VendorOnboardingPage() {
  const [vendor, setVendor] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVendorMe()
      .then(setVendor)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

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
  const steps = [
    { label: 'Submit application', done: true },
    { label: 'Admin approval', done: status === 'approved' },
    {
      label: 'Shop branding & policies',
      done: Boolean((vendor.shop as { shippingPolicy?: string } | null)?.shippingPolicy),
      href: '/vendor/shop',
    },
    {
      label: 'Publish first product',
      done: false,
      href: '/vendor/products/new',
      note: 'Requires approval',
    },
    { label: 'Stripe Connect', done: false, note: 'Phase 3' },
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
            <div>
              <p className="font-semibold">{step.label}</p>
              {step.note ? <p className="text-sm text-subtle">{step.note}</p> : null}
              {step.href && status === 'approved' ? (
                <Link href={step.href} className="text-sm text-accent">
                  Open
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {status === 'approved' ? (
        <Link href="/vendor" className="mt-8 inline-block text-accent">
          Go to dashboard →
        </Link>
      ) : null}
    </div>
  );
}
