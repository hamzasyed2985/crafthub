import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { requireAuth } from '../../middleware/auth.js';
import { requireVendor, type VendorRequest } from '../../middleware/vendor.js';

export const vendorEarningsRouter = Router();

vendorEarningsRouter.use(requireAuth, requireVendor({ requireApproved: true }));

const EARNING_STATUSES = ['paid', 'fulfilling', 'shipped', 'delivered'] as const;

vendorEarningsRouter.get('/', async (req: VendorRequest, res, next) => {
  try {
    const vendorId = req.vendorId!;
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const slices = await prisma.vendorOrder.findMany({
      where: {
        vendorId,
        status: { in: [...EARNING_STATUSES] },
      },
      include: { transfer: true },
      orderBy: { createdAt: 'desc' },
    });

    let grossSalesCents = 0;
    let commissionCents = 0;
    let netCents = 0;
    let shippingCents = 0;
    let last7dNetCents = 0;
    let last30dNetCents = 0;
    let pendingPayoutCents = 0;
    let paidOutCents = 0;

    for (const vo of slices) {
      grossSalesCents += vo.itemsSubtotalCents;
      commissionCents += vo.commissionCents;
      netCents += vo.vendorNetCents;
      shippingCents += vo.shippingCents;

      if (vo.createdAt >= last7d) last7dNetCents += vo.vendorNetCents;
      if (vo.createdAt >= last30d) last30dNetCents += vo.vendorNetCents;

      if (vo.transfer?.status === 'paid') {
        paidOutCents += vo.transfer.amountCents;
      } else {
        // pending/failed transfer, or paid VO without a paid transfer
        pendingPayoutCents += vo.vendorNetCents;
      }
    }

    const transfers = await prisma.transfer.findMany({
      where: { vendorOrder: { vendorId } },
      include: {
        vendorOrder: {
          select: { id: true, orderId: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      data: {
        grossSalesCents,
        commissionCents,
        netCents,
        shippingCents,
        pendingPayoutCents,
        paidOutCents,
        last7dNetCents,
        last30dNetCents,
        recentTransfers: transfers.map((t) => ({
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
      },
    });
  } catch (err) {
    next(err);
  }
});
