'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button, Price } from '@crafthub/ui';
import { fetchAdminSettings, patchAdminSettings } from '@/lib/api';

export default function AdminSettingsPage() {
  const [commissionBps, setCommissionBps] = useState(1000);
  const [debtThreshold, setDebtThreshold] = useState(10000);
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchAdminSettings()
      .then((s) => {
        setCommissionBps(s.commissionBps);
        setDebtThreshold(s.debtReviewThresholdCents);
        setCurrency(s.currency);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      const s = await patchAdminSettings({
        commissionBps,
        debtReviewThresholdCents: debtThreshold,
        currency,
      });
      setCommissionBps(s.commissionBps);
      setDebtThreshold(s.debtReviewThresholdCents);
      setCurrency(s.currency);
      setNote('Saved. Commission applies to new checkouts only.');
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Settings</h1>
        <Link href="/admin" className="text-sm text-accent">
          Overview
        </Link>
      </div>
      {error ? <p className="mt-4 text-danger">{error}</p> : null}

      <form onSubmit={(e) => void onSave(e)} className="mt-8 space-y-4">
        <div>
          <label className="text-sm text-subtle" htmlFor="bps">
            Commission (bps)
          </label>
          <input
            id="bps"
            type="number"
            className="mt-1 w-full rounded-md border border-border bg-canvas px-3 py-2"
            value={commissionBps}
            onChange={(e) => setCommissionBps(Number(e.target.value))}
          />
          <p className="mt-1 text-xs text-subtle">1000 = 10%</p>
        </div>
        <div>
          <label className="text-sm text-subtle" htmlFor="debt">
            Debt review threshold
          </label>
          <input
            id="debt"
            type="number"
            className="mt-1 w-full rounded-md border border-border bg-canvas px-3 py-2"
            value={debtThreshold}
            onChange={(e) => setDebtThreshold(Number(e.target.value))}
          />
          <p className="mt-1 text-xs text-subtle">
            Flag vendors when outstanding debt ≥ <Price cents={debtThreshold} />
          </p>
        </div>
        <div>
          <label className="text-sm text-subtle" htmlFor="currency">
            Currency
          </label>
          <input
            id="currency"
            className="mt-1 w-full rounded-md border border-border bg-canvas px-3 py-2"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            maxLength={3}
          />
        </div>
        <Button type="submit" disabled={busy}>
          Save
        </Button>
        {note ? <p className="text-sm">{note}</p> : null}
      </form>
    </div>
  );
}
