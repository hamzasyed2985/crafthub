import { Router } from 'express';
import { prisma, type Prisma } from '@crafthub/db';
import { shipVendorOrderSchema, VENDOR_ORDER_STATUSES } from '@crafthub/shared';
import { AppError } from '../../lib/errors.js';
import { enqueueEmail } from '../../lib/email.js';
import { parsePagination, routeParam } from '../../lib/helpers.js';
import { syncParentOrderFulfillmentStatus } from '../../lib/orders.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireVendor, type VendorRequest } from '../../middleware/vendor.js';

export const vendorOrdersRouter = Router();

vendorOrdersRouter.use(requireAuth, requireVendor({ requireApproved: true }));

const FILTERABLE_STATUSES = new Set(['paid', 'fulfilling', 'shipped', 'delivered'] as const);

const vendorOrderInclude = {
  items: true,
  transfer: true,
  order: {
    select: {
      id: true,
      status: true,
      shipName: true,
      shipLine1: true,
      shipLine2: true,
      shipCity: true,
      shipRegion: true,
      shipPostalCode: true,
      shipCountry: true,
      createdAt: true,
    },
  },
} as const;

type VendorOrderLoaded = Prisma.VendorOrderGetPayload<{ include: typeof vendorOrderInclude }>;

function serializeVendorOrder(vo: VendorOrderLoaded) {
  return {
    id: vo.id,
    status: vo.status,
    itemsSubtotalCents: vo.itemsSubtotalCents,
    shippingCents: vo.shippingCents,
    commissionCents: vo.commissionCents,
    vendorNetCents: vo.vendorNetCents,
    commissionBps: vo.commissionBps,
    trackingNumber: vo.trackingNumber,
    carrier: vo.carrier,
    fulfillingAt: vo.fulfillingAt?.toISOString() ?? null,
    shippedAt: vo.shippedAt?.toISOString() ?? null,
    items: vo.items.map((item) => ({
      id: item.id,
      title: item.title,
      productSlug: item.productSlug,
      sku: item.sku,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
    })),
    order: {
      id: vo.order.id,
      status: vo.order.status,
      shipName: vo.order.shipName,
      shipLine1: vo.order.shipLine1,
      shipLine2: vo.order.shipLine2,
      shipCity: vo.order.shipCity,
      shipRegion: vo.order.shipRegion,
      shipPostalCode: vo.order.shipPostalCode,
      shipCountry: vo.order.shipCountry,
      createdAt: vo.order.createdAt.toISOString(),
    },
    transfer: vo.transfer
      ? {
          status: vo.transfer.status,
          amountCents: vo.transfer.amountCents,
          stripeTransferId: vo.transfer.stripeTransferId,
        }
      : null,
    createdAt: vo.createdAt.toISOString(),
    updatedAt: vo.updatedAt.toISOString(),
  };
}

vendorOrdersRouter.get('/', async (req: VendorRequest, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined;
    if (statusRaw && !FILTERABLE_STATUSES.has(statusRaw as 'paid' | 'fulfilling' | 'shipped' | 'delivered')) {
      throw new AppError(
        400,
        'INVALID_STATUS',
        `status filter must be one of: ${[...FILTERABLE_STATUSES].join(', ')}`,
      );
    }

    const where: Prisma.VendorOrderWhereInput = {
      vendorId: req.vendorId!,
      ...(statusRaw ? { status: statusRaw as (typeof VENDOR_ORDER_STATUSES)[number] } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.vendorOrder.count({ where }),
      prisma.vendorOrder.findMany({
        where,
        include: vendorOrderInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      data: rows.map(serializeVendorOrder),
      meta: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
});

vendorOrdersRouter.get('/:id', async (req: VendorRequest, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const row = await prisma.vendorOrder.findFirst({
      where: { id, vendorId: req.vendorId! },
      include: vendorOrderInclude,
    });
    if (!row) throw new AppError(404, 'NOT_FOUND', 'Vendor order not found');
    res.json({ data: { vendorOrder: serializeVendorOrder(row) } });
  } catch (err) {
    next(err);
  }
});

vendorOrdersRouter.post('/:id/fulfill', async (req: VendorRequest, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const actorId = req.user!.sub;

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.vendorOrder.findFirst({
        where: { id, vendorId: req.vendorId! },
        include: vendorOrderInclude,
      });
      if (!row) throw new AppError(404, 'NOT_FOUND', 'Vendor order not found');
      if (row.status !== 'paid') {
        throw new AppError(
          400,
          'INVALID_STATUS',
          `Cannot fulfill from status ${row.status}`,
        );
      }

      const now = new Date();
      await tx.vendorOrder.update({
        where: { id: row.id },
        data: { status: 'fulfilling', fulfillingAt: now },
      });

      await syncParentOrderFulfillmentStatus(tx, row.orderId);

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'vendor_order.fulfill',
          entity: 'vendor_order',
          entityId: row.id,
          meta: { from: 'paid', to: 'fulfilling' },
        },
      });

      return tx.vendorOrder.findFirstOrThrow({
        where: { id: row.id },
        include: vendorOrderInclude,
      });
    });

    res.json({ data: { vendorOrder: serializeVendorOrder(updated) } });
  } catch (err) {
    next(err);
  }
});

vendorOrdersRouter.post('/:id/ship', async (req: VendorRequest, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const input = shipVendorOrderSchema.parse(req.body ?? {});
    const actorId = req.user!.sub;

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.vendorOrder.findFirst({
        where: { id, vendorId: req.vendorId! },
        include: vendorOrderInclude,
      });
      if (!row) throw new AppError(404, 'NOT_FOUND', 'Vendor order not found');
      if (row.status !== 'paid' && row.status !== 'fulfilling') {
        throw new AppError(
          400,
          'INVALID_STATUS',
          `Cannot ship from status ${row.status}`,
        );
      }

      const now = new Date();
      await tx.vendorOrder.update({
        where: { id: row.id },
        data: {
          status: 'shipped',
          shippedAt: now,
          trackingNumber: input.trackingNumber ?? null,
          carrier: input.carrier ?? null,
          fulfillingAt: row.fulfillingAt ?? (row.status === 'paid' ? now : row.fulfillingAt),
        },
      });

      await syncParentOrderFulfillmentStatus(tx, row.orderId);

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'vendor_order.ship',
          entity: 'vendor_order',
          entityId: row.id,
          meta: {
            from: row.status,
            to: 'shipped',
            trackingNumber: input.trackingNumber ?? null,
            carrier: input.carrier ?? null,
          },
        },
      });

      return tx.vendorOrder.findFirstOrThrow({
        where: { id: row.id },
        include: vendorOrderInclude,
      });
    });

    const parent = await prisma.order.findUnique({
      where: { id: updated.orderId },
      include: { buyer: true },
    });
    if (parent?.buyer.email) {
      try {
        await enqueueEmail({
          toEmail: parent.buyer.email,
          template: 'order.shipped',
          payload: {
            orderId: parent.id,
            name: parent.buyer.name,
            trackingNumber: updated.trackingNumber,
            carrier: updated.carrier,
          },
        });
      } catch {
        // non-fatal
      }
    }

    res.json({ data: { vendorOrder: serializeVendorOrder(updated) } });
  } catch (err) {
    next(err);
  }
});

/** Mark a shipped vendor order as delivered (buyer received the package). */
vendorOrdersRouter.post('/:id/deliver', async (req: VendorRequest, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const actorId = req.user!.sub;

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.vendorOrder.findFirst({
        where: { id, vendorId: req.vendorId! },
        include: vendorOrderInclude,
      });
      if (!row) throw new AppError(404, 'NOT_FOUND', 'Vendor order not found');
      if (row.status !== 'shipped') {
        throw new AppError(
          400,
          'INVALID_STATUS',
          `Cannot mark delivered from status ${row.status}`,
        );
      }

      await tx.vendorOrder.update({
        where: { id: row.id },
        data: { status: 'delivered' },
      });

      await syncParentOrderFulfillmentStatus(tx, row.orderId);

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'vendor_order.deliver',
          entity: 'vendor_order',
          entityId: row.id,
          meta: { from: 'shipped', to: 'delivered' },
        },
      });

      return tx.vendorOrder.findFirstOrThrow({
        where: { id: row.id },
        include: vendorOrderInclude,
      });
    });

    res.json({ data: { vendorOrder: serializeVendorOrder(updated) } });
  } catch (err) {
    next(err);
  }
});
