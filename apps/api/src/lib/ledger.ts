import { prisma, type Prisma } from '@crafthub/db';

type Tx = Prisma.TransactionClient;

/** Outstanding vendor debt = refund_debt − debt_offset (never negative). */
export async function getVendorOutstandingDebtCents(
  vendorId: string,
  db: typeof prisma | Tx = prisma,
): Promise<number> {
  const grouped = await db.vendorLedgerEntry.groupBy({
    by: ['kind'],
    where: { vendorId },
    _sum: { amountCents: true },
  });
  let debt = 0;
  let offset = 0;
  for (const row of grouped) {
    const sum = row._sum.amountCents ?? 0;
    if (row.kind === 'refund_debt') debt += sum;
    else if (row.kind === 'debt_offset') offset += sum;
  }
  return Math.max(0, debt - offset);
}

export async function getDebtReviewThresholdCents(
  db: typeof prisma | Tx = prisma,
): Promise<number> {
  const settings = await db.platformSettings.findFirst({
    orderBy: { updatedAt: 'desc' },
  });
  return settings?.debtReviewThresholdCents ?? 10_000;
}

/** Flag vendor when debt ≥ threshold; clear when debt is fully recovered. */
export async function syncVendorLedgerReviewFlag(
  vendorId: string,
  db: typeof prisma | Tx = prisma,
): Promise<{ outstandingDebtCents: number; ledgerReviewRequired: boolean }> {
  const [outstandingDebtCents, threshold] = await Promise.all([
    getVendorOutstandingDebtCents(vendorId, db),
    getDebtReviewThresholdCents(db),
  ]);
  const ledgerReviewRequired = outstandingDebtCents >= threshold && outstandingDebtCents > 0;
  await db.vendorProfile.update({
    where: { id: vendorId },
    data: { ledgerReviewRequired },
  });
  return { outstandingDebtCents, ledgerReviewRequired };
}

export async function recordRefundDebt(
  opts: {
    vendorId: string;
    amountCents: number;
    currency: string;
    orderId: string;
    vendorOrderId: string;
    note?: string;
  },
  db: typeof prisma | Tx = prisma,
) {
  if (opts.amountCents <= 0) return null;
  const entry = await db.vendorLedgerEntry.create({
    data: {
      vendorId: opts.vendorId,
      kind: 'refund_debt',
      amountCents: opts.amountCents,
      currency: opts.currency,
      orderId: opts.orderId,
      vendorOrderId: opts.vendorOrderId,
      note: opts.note ?? 'Post-payout refund clawback',
    },
  });
  await syncVendorLedgerReviewFlag(opts.vendorId, db);
  return entry;
}

/**
 * Apply outstanding debt against a new payout amount.
 * Returns cents still sendable to Stripe after netting.
 */
export async function applyDebtOffsetToPayout(
  opts: {
    vendorId: string;
    payoutCents: number;
    currency: string;
    orderId: string;
    vendorOrderId: string;
  },
  db: typeof prisma | Tx = prisma,
): Promise<{ sendCents: number; offsetCents: number }> {
  if (opts.payoutCents <= 0) {
    return { sendCents: 0, offsetCents: 0 };
  }
  const debt = await getVendorOutstandingDebtCents(opts.vendorId, db);
  const offsetCents = Math.min(debt, opts.payoutCents);
  if (offsetCents > 0) {
    await db.vendorLedgerEntry.create({
      data: {
        vendorId: opts.vendorId,
        kind: 'debt_offset',
        amountCents: offsetCents,
        currency: opts.currency,
        orderId: opts.orderId,
        vendorOrderId: opts.vendorOrderId,
        note: 'Netted against subsequent payout',
      },
    });
    await syncVendorLedgerReviewFlag(opts.vendorId, db);
  }
  return { sendCents: opts.payoutCents - offsetCents, offsetCents };
}
