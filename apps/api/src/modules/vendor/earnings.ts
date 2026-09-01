import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { getVendorOutstandingDebtCents } from '../../lib/ledger.js';
import { parsePagination } from '../../lib/helpers.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireVendor, type VendorRequest } from '../../middleware/vendor.js';

export const vendorEarningsRouter = Router();

vendorEarningsRouter.use(requireAuth, requireVendor({ requireApproved: true }));

const EARNING_STATUSES = ['paid', 'fulfilling', 'shipped', 'delivered'] as const;

function earningWhere(vendorId: string) {
  return {
    vendorId,
    status: { in: [...EARNING_STATUSES] },
  };
}

/** Aggregated earnings summary (no unbounded lists). */
vendorEarningsRouter.get('/', async (req: VendorRequest, res, next) => {
  try {
    const vendorId = req.vendorId!;
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const where = earningWhere(vendorId);

    const [totals, net7d, net30d, paidOutAgg, pendingAgg, outstandingDebtCents] =
      await Promise.all([
        prisma.vendorOrder.aggregate({
          where,
          _sum: {
            itemsSubtotalCents: true,
            commissionCents: true,
            vendorNetCents: true,
            shippingCents: true,
          },
        }),
        prisma.vendorOrder.aggregate({
          where: { ...where, createdAt: { gte: last7d } },
          _sum: { vendorNetCents: true },
        }),
        prisma.vendorOrder.aggregate({
          where: { ...where, createdAt: { gte: last30d } },
          _sum: { vendorNetCents: true },
        }),
        prisma.transfer.aggregate({
          where: { vendorOrder: { vendorId }, status: 'paid' },
          _sum: { amountCents: true },
        }),
        prisma.vendorOrder.aggregate({
          where: {
            ...where,
            OR: [{ transfer: { is: null } }, { transfer: { status: { not: 'paid' } } }],
          },
          _sum: { vendorNetCents: true },
        }),
        getVendorOutstandingDebtCents(vendorId),
      ]);

    res.json({
      data: {
        grossSalesCents: totals._sum?.itemsSubtotalCents ?? 0,
        commissionCents: totals._sum?.commissionCents ?? 0,
        netCents: totals._sum?.vendorNetCents ?? 0,
        shippingCents: totals._sum?.shippingCents ?? 0,
        pendingPayoutCents: pendingAgg._sum?.vendorNetCents ?? 0,
        paidOutCents: paidOutAgg._sum?.amountCents ?? 0,
        last7dNetCents: net7d._sum?.vendorNetCents ?? 0,
        last30dNetCents: net30d._sum?.vendorNetCents ?? 0,
        outstandingDebtCents,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** Paginated Connect transfer history for this vendor. */
vendorEarningsRouter.get('/transfers', async (req: VendorRequest, res, next) => {
  try {
    const vendorId = req.vendorId!;
    const { page, limit, skip } = parsePagination(req.query);

    const where = { vendorOrder: { vendorId } };

    const [total, transfers] = await Promise.all([
      prisma.transfer.count({ where }),
      prisma.transfer.findMany({
        where,
        include: {
          vendorOrder: {
            select: { id: true, orderId: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      data: transfers.map((t) => ({
        id: t.id,
        status: t.status,
        amountCents: t.amountCents,
        currency: t.currency,
        stripeTransferId: t.stripeTransferId,
        vendorOrderId: t.vendorOrderId,
        orderId: t.vendorOrder.orderId,
        vendorOrderStatus: t.vendorOrder.status,
        createdAt: t.createdAt.toISOString(),
      })),
      meta: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
});
