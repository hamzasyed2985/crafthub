'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Price } from '@crafthub/ui';
import { Page } from '@/components/page';
import { PaginationControls } from '@/components/pagination-controls';
import { fetchAdminFinance, fetchAdminVendorLedger } from '@/lib/api';
import { formatStatusLabel } from '@/lib/format-status';

type Finance = Awaited<ReturnType<typeof fetchAdminFinance>>['data'];
type Ledger = Awaited<ReturnType<typeof fetchAdminVendorLedger>>['data'];

export default function AdminFinancePage() {
  const [data, setData] = useState<Finance | null>(null);
  const [vendorPage, setVendorPage] = useState(1);
  const [vendorTotal, setVendorTotal] = useState(0);
  const [vendorLimit, setVendorLimit] = useState(24);
  const [recentPage, setRecentPage] = useState(1);
  const [recentTotal, setRecentTotal] = useState(0);
  const [recentLimit, setRecentLimit] = useState(24);
  const [error, setError] = useState<string | null>(null);
  const [ledgerVendorId, setLedgerVendorId] = useState<string | null>(null);
  const [ledgerVendorName, setLedgerVendorName] = useState<string | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerLimit, setLedgerLimit] = useState(24);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminFinance({ vendorPage, vendorLimit: 24, recentPage, recentLimit: 24 })
      .then((res) => {
        setData(res.data);
        setVendorTotal(res.meta.byVendor.total);
        setVendorLimit(res.meta.byVendor.limit);
        setRecentTotal(res.meta.recentCommissions.total);
        setRecentLimit(res.meta.recentCommissions.limit);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, [vendorPage, recentPage]);

  async function openLedger(vendorId: string, displayName: string) {
    setLedgerVendorId(vendorId);
    setLedgerVendorName(displayName);
    setLedgerPage(1);
    setLedger(null);
    setLedgerError(null);
    await loadLedger(vendorId, 1);
  }

  async function loadLedger(vendorId: string, page: number) {
    setLedger(null);
    setLedgerError(null);
    try {
      const res = await fetchAdminVendorLedger(vendorId, page, 24);
      setLedger(res.data);
      setLedgerTotal(res.meta.total);
      setLedgerLimit(res.meta.limit);
    } catch (err) {
      setLedgerError(err instanceof Error ? err.message : 'Failed to load ledger');
    }
  }

  function closeLedger() {
    setLedgerVendorId(null);
    setLedgerVendorName(null);
    setLedger(null);
    setLedgerPage(1);
    setLedgerError(null);
  }

  useEffect(() => {
    if (!ledgerVendorId) return;
    void loadLedger(ledgerVendorId, ledgerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerPage]);

  useEffect(() => {
    if (!ledgerVendorId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLedger();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ledgerVendorId]);

  if (error) {
    return (
      <Page size="default">
        <p className="text-danger">{error}</p>
      </Page>
    );
  }

  if (!data)
    return (
      <Page size="default">
        <p className="text-subtle">Loading finance…</p>
      </Page>
    );

  const ratePct = (data.settings.commissionBps / 100).toFixed(1);

  return (
    <Page size="default">
      <h1 className="font-display text-3xl">Finance</h1>
      <p className="mt-1 text-muted">
        Platform commission ({ratePct}%) — where revenue came from
      </p>
      <p className="mt-2 text-sm">
        <Link href="/admin/settings" className="text-accent hover:underline">
          Edit commission settings
        </Link>
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Platform revenue', cents: data.totals.platformRevenueCents },
          { label: 'GMV (items)', cents: data.totals.gmvCents },
          { label: 'Paid to vendors', cents: data.totals.paidOutCents },
          { label: 'Vendor debt outstanding', cents: data.totals.outstandingVendorDebtCents },
        ].map((c) => (
          <div key={c.label} className="rounded-md border border-border bg-elevated p-4">
            <p className="text-sm text-subtle">{c.label}</p>
            <p className="mt-1 font-display text-2xl">
              <Price cents={c.cents} currency={data.settings.currency} />
            </p>
          </div>
        ))}
      </section>

      <p className="mt-3 text-sm text-subtle">
        Rate stored as {data.settings.commissionBps} bps · {data.totals.paidTransferCount} paid
        transfers · debt review threshold{' '}
        <Price cents={data.settings.debtReviewThresholdCents} currency={data.settings.currency} />
      </p>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Commission by vendor</h2>
        <p className="mt-1 text-sm text-muted">
          Snapshot at checkout: commission = item subtotal × rate (shipping excluded).
        </p>
        {data.byVendor.length === 0 ? (
          <p className="mt-4 text-muted">No commission earned yet.</p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-subtle">
                    <th className="py-2 pr-3 font-medium">Vendor</th>
                    <th className="py-2 pr-3 font-medium">Orders</th>
                    <th className="py-2 pr-3 font-medium">GMV</th>
                    <th className="py-2 pr-3 font-medium">Commission</th>
                    <th className="py-2 pr-3 font-medium">Vendor net</th>
                    <th className="py-2 pr-3 font-medium">Debt</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.byVendor.map((v) => (
                    <tr key={v.vendorId} className="border-b border-border/70">
                      <td className="py-3 pr-3">
                        <Link href={`/shops/${v.slug}`} className="font-semibold text-accent">
                          {v.displayName}
                        </Link>
                        {v.ledgerReviewRequired ? (
                          <span className="ml-2 text-xs text-warning">review</span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3">{v.orderCount}</td>
                      <td className="py-3 pr-3">
                        <Price cents={v.gmvCents} />
                      </td>
                      <td className="py-3 pr-3 font-semibold">
                        <Price cents={v.commissionCents} />
                      </td>
                      <td className="py-3 pr-3">
                        <Price cents={v.vendorNetCents} />
                      </td>
                      <td className="py-3 pr-3">
                        <Price cents={v.outstandingDebtCents} />
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          className="text-accent hover:underline"
                          onClick={() => void openLedger(v.vendorId, v.displayName)}
                        >
                          Ledger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={vendorPage}
              limit={vendorLimit}
              total={vendorTotal}
              onPageChange={setVendorPage}
            />
          </>
        )}
      </section>

      {ledgerVendorId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-inverse/50 p-4"
          role="presentation"
          onClick={closeLedger}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="vendor-ledger-title"
            className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-md border border-border bg-elevated shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h3 id="vendor-ledger-title" className="font-display text-xl">
                  Vendor ledger
                </h3>
                {ledgerVendorName ? (
                  <p className="mt-0.5 text-sm text-muted">{ledgerVendorName}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-muted hover:bg-background-subtle hover:text-foreground"
                onClick={closeLedger}
              >
                Close
              </button>
            </div>
            <div className="max-h-[calc(85vh-4.5rem)] overflow-y-auto px-5 py-4">
              {ledgerError ? <p className="text-danger">{ledgerError}</p> : null}
              {!ledger && !ledgerError ? <p className="text-subtle">Loading…</p> : null}
              {ledger ? (
                <>
                  <p className="text-sm text-muted">
                    Outstanding debt <Price cents={ledger.outstandingDebtCents} />
                    {ledger.ledgerReviewRequired ? ' · needs review' : ''}
                  </p>
                  {ledger.entries.length === 0 ? (
                    <p className="mt-3 text-sm text-subtle">No ledger entries.</p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-sm">
                      {ledger.entries.map((e) => (
                        <li
                          key={e.id}
                          className="flex flex-wrap justify-between gap-2 border-b border-border/60 py-2"
                        >
                          <span>
                            <span className="font-medium">{e.kind}</span>
                            {e.note ? ` · ${e.note}` : ''}
                            {e.orderId ? (
                              <>
                                {' · '}
                                <Link
                                  href={`/admin/orders/${e.orderId}`}
                                  className="text-accent"
                                  onClick={closeLedger}
                                >
                                  order
                                </Link>
                              </>
                            ) : null}
                          </span>
                          <span>
                            <Price cents={e.amountCents} currency={e.currency} />
                            <span className="ml-2 text-subtle">
                              {new Date(e.createdAt).toLocaleDateString()}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <PaginationControls
                    page={ledgerPage}
                    limit={ledgerLimit}
                    total={ledgerTotal}
                    onPageChange={setLedgerPage}
                  />
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <section className="mt-12">
        <h2 className="font-display text-2xl">Recent commission sources</h2>
        <p className="mt-1 text-sm text-muted">
          Each row is a vendor slice of an order — products sold and the fee CraftHub kept.
        </p>
        {data.recentCommissions.length === 0 ? (
          <p className="mt-4 text-muted">No commission lines yet.</p>
        ) : (
          <>
            <ul className="mt-6 space-y-4">
              {data.recentCommissions.map((row) => (
                <li key={row.vendorOrderId} className="rounded-md border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{row.vendor.displayName}</p>
                      <p className="text-sm text-subtle">
                        {formatStatusLabel(row.vendorOrderStatus)} · order{' '}
                        {formatStatusLabel(row.orderStatus)} ·{' '}
                        {(row.commissionBps / 100).toFixed(1)}% of items
                      </p>
                      <ul className="mt-2 text-sm text-muted">
                        {row.items.map((item, i) => (
                          <li key={`${row.vendorOrderId}-${i}`}>
                            {item.quantity}× {item.title} (
                            <Price cents={item.lineTotalCents} />)
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-right text-sm">
                      <p>
                        Commission{' '}
                        <span className="font-semibold">
                          <Price cents={row.commissionCents} />
                        </span>
                      </p>
                      <p className="text-subtle">
                        Net <Price cents={row.vendorNetCents} />
                        {row.transferStatus
                          ? ` · transfer ${formatStatusLabel(row.transferStatus)}`
                          : ''}
                      </p>
                      <Link
                        href={`/admin/orders/${row.orderId}`}
                        className="mt-2 inline-block text-accent"
                      >
                        View order
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <PaginationControls
              page={recentPage}
              limit={recentLimit}
              total={recentTotal}
              onPageChange={setRecentPage}
            />
          </>
        )}
      </section>
    </Page>
  );
}
