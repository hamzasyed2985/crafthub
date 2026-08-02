import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { serializeVendor } from '../../lib/serializers.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireVendor, type VendorRequest } from '../../middleware/vendor.js';

export const vendorDashboardRouter = Router();

vendorDashboardRouter.use(requireAuth, requireVendor({ requireApproved: true }));

vendorDashboardRouter.get('/', async (req: VendorRequest, res, next) => {
  try {
    const vendorId = req.vendorId!;
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [vendor, ordersToFulfill, recent, ordersByStatus, productCount, lowStockCount] =
      await Promise.all([
        prisma.vendorProfile.findUniqueOrThrow({
          where: { id: vendorId },
          include: { shop: true, stripeAccount: true },
        }),
        prisma.vendorOrder.count({
          where: {
            vendorId,
            status: { in: ['paid', 'fulfilling'] },
          },
        }),
        prisma.vendorOrder.findMany({
          where: {
            vendorId,
            status: { in: ['paid', 'fulfilling', 'shipped', 'delivered'] },
            createdAt: { gte: last30d },
          },
          select: { vendorNetCents: true, createdAt: true },
        }),
        prisma.vendorOrder.groupBy({
          by: ['status'],
          where: { vendorId },
          _count: true,
        }),
        prisma.product.count({
          where: { shop: { vendorId } },
        }),
        prisma.product.count({
          where: {
            shop: { vendorId },
            status: 'active',
            variants: { some: { stockQty: { lt: 3 } } },
          },
        }),
      ]);

    let net7dCents = 0;
    let net30dCents = 0;
    for (const vo of recent) {
      net30dCents += vo.vendorNetCents;
      if (vo.createdAt >= last7d) net7dCents += vo.vendorNetCents;
    }

    res.json({
      data: {
        ordersToFulfill,
        net7dCents,
        net30dCents,
        productCount,
        lowStockCount,
        ordersByStatus: Object.fromEntries(ordersByStatus.map((r) => [r.status, r._count])),
        vendor: serializeVendor(vendor),
      },
    });
  } catch (err) {
    next(err);
  }
});
