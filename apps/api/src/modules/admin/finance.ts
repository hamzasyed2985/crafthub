import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { adminRefundSchema, adminSettingsPatchSchema } from '@crafthub/shared';
import { AppError } from '../../lib/errors.js';
import { parsePagination, routeParam } from '../../lib/helpers.js';
import { getVendorOutstandingDebtCents } from '../../lib/ledger.js';
import { refundOrder } from '../../lib/refunds.js';
import { requireAuth, requireRole, type AuthedRequest } from '../../middleware/auth.js';

export const adminFinanceRouter = Router();

/** Explicit element typing so tsc stays happy if Prisma client types are unavailable in CI. */
type Elem<T> = T extends readonly (infer U)[] ? U : never;

adminFinanceRouter.use(requireAuth, requireRole('admin'));

adminFinanceRouter.get('/metrics', async (_req, res, next) => {
  try {
    const paidLike = ['paid', 'processing', 'completed', 'refunded'] as const;

    const [
      gmvAgg,
      commissionAgg,
      orderCounts,
      vendorCounts,
      refundedCount,
      debtVendors,
      outstandingDebtRows,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { status: { in: [...paidLike] } },
        _sum: { itemsSubtotalCents: true },
      }),
      prisma.vendorOrder.aggregate({
        where: { status: { in: ['paid', 'fulfilling', 'shipped', 'delivered', 'refunded'] } },
        _sum: { commissionCents: true },
      }),
      prisma.order.groupBy({ by: ['status'], _count: true }),
      prisma.vendorProfile.groupBy({ by: ['status'], _count: true }),
      prisma.order.count({ where: { status: 'refunded' } }),
      prisma.vendorProfile.count({ where: { ledgerReviewRequired: true } }),
      prisma.vendorLedgerEntry.groupBy({
        by: ['kind'],
        _sum: { amountCents: true },
      }),
    ]);

    let debt = 0;
    let offset = 0;
    for (const row of outstandingDebtRows) {
      const sum = row._sum.amountCents ?? 0;
      if (row.kind === 'refund_debt') debt += sum;
      else if (row.kind === 'debt_offset') offset += sum;
    }

    const paidOrders = orderCounts
      .filter((r) => r.status === 'paid' || r.status === 'processing' || r.status === 'completed')
      .reduce((n, r) => n + r._count, 0);
    const refundRate =
      paidOrders + refundedCount > 0
        ? refundedCount / (paidOrders + refundedCount)
        : 0;

    res.json({
      data: {
        gmvCents: gmvAgg._sum.itemsSubtotalCents ?? 0,
        platformRevenueCents: commissionAgg._sum.commissionCents ?? 0,
        ordersByStatus: Object.fromEntries(orderCounts.map((r) => [r.status, r._count])),
        vendorsByStatus: Object.fromEntries(vendorCounts.map((r) => [r.status, r._count])),
        refundedOrders: refundedCount,
        refundRate,
        outstandingVendorDebtCents: Math.max(0, debt - offset),
        vendorsNeedingLedgerReview: debtVendors,
      },
    });
  } catch (err) {
    next(err);
  }
});

adminFinanceRouter.get('/settings', async (_req, res, next) => {
  try {
    let settings = await prisma.platformSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: {},
      });
    }
    res.json({
      data: {
        settings: {
          id: settings.id,
          commissionBps: settings.commissionBps,
          currency: settings.currency,
          debtReviewThresholdCents: settings.debtReviewThresholdCents,
          updatedAt: settings.updatedAt.toISOString(),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

adminFinanceRouter.patch('/settings', async (req: AuthedRequest, res, next) => {
  try {
    const input = adminSettingsPatchSchema.parse(req.body);
    let settings = await prisma.platformSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    if (!settings) {
      settings = await prisma.platformSettings.create({ data: {} });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.platformSettings.update({
        where: { id: settings!.id },
        data: {
          commissionBps: input.commissionBps,
          currency: input.currency,
          debtReviewThresholdCents: input.debtReviewThresholdCents,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.sub,
          action: 'settings.patch',
          entity: 'platform_settings',
          entityId: row.id,
          meta: input,
        },
      });
      return row;
    });

    res.json({
      data: {
        settings: {
          id: updated.id,
          commissionBps: updated.commissionBps,
          currency: updated.currency,
          debtReviewThresholdCents: updated.debtReviewThresholdCents,
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

adminFinanceRouter.get('/orders', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const where = status ? { status: status as 'paid' | 'refunded' | 'pending_payment' | 'processing' | 'completed' | 'cancelled' } : {};

    const [total, rows] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          buyer: { select: { id: true, email: true, name: true } },
          payment: true,
          vendorOrders: {
            include: {
              vendor: { select: { id: true, displayName: true, slug: true } },
              transfer: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      data: rows.map((o: Elem<typeof rows>) => ({
        id: o.id,
        status: o.status,
        totalCents: o.totalCents,
        itemsSubtotalCents: o.itemsSubtotalCents,
        commissionTotalCents: o.commissionTotalCents,
        currency: o.currency,
        buyer: o.buyer,
        paymentStatus: o.payment?.status ?? null,
        vendorOrderCount: o.vendorOrders.length,
        createdAt: o.createdAt.toISOString(),
      })),
      meta: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
});

adminFinanceRouter.get('/orders/:id', async (req, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, email: true, name: true } },
        payment: true,
        vendorOrders: {
          include: {
            vendor: {
              select: {
                id: true,
                displayName: true,
                slug: true,
                ledgerReviewRequired: true,
              },
            },
            items: true,
            transfer: true,
          },
        },
      },
    });
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');

    const vendorDebts = await Promise.all(
      order.vendorOrders.map(async (vo: Elem<typeof order.vendorOrders>) => ({
        vendorId: vo.vendorId,
        outstandingDebtCents: await getVendorOutstandingDebtCents(vo.vendorId),
      })),
    );
    const debtByVendor = Object.fromEntries(
      vendorDebts.map((d: Elem<typeof vendorDebts>) => [d.vendorId, d.outstandingDebtCents]),
    );

    res.json({
      data: {
        order: {
          id: order.id,
          status: order.status,
          currency: order.currency,
          itemsSubtotalCents: order.itemsSubtotalCents,
          shippingTotalCents: order.shippingTotalCents,
          totalCents: order.totalCents,
          commissionTotalCents: order.commissionTotalCents,
          shipping: {
            name: order.shipName,
            line1: order.shipLine1,
            line2: order.shipLine2,
            city: order.shipCity,
            region: order.shipRegion,
            postalCode: order.shipPostalCode,
            country: order.shipCountry,
          },
          buyer: order.buyer,
          payment: order.payment
            ? {
                status: order.payment.status,
                amountCents: order.payment.amountCents,
                paymentIntentId: order.payment.paymentIntentId,
                checkoutSessionId: order.payment.checkoutSessionId,
              }
            : null,
          vendorOrders: order.vendorOrders.map((vo: Elem<typeof order.vendorOrders>) => ({
            id: vo.id,
            status: vo.status,
            vendor: vo.vendor,
            itemsSubtotalCents: vo.itemsSubtotalCents,
            shippingCents: vo.shippingCents,
            commissionCents: vo.commissionCents,
            vendorNetCents: vo.vendorNetCents,
            outstandingDebtCents: debtByVendor[vo.vendorId] ?? 0,
            transfer: vo.transfer
              ? {
                  status: vo.transfer.status,
                  amountCents: vo.transfer.amountCents,
                  stripeTransferId: vo.transfer.stripeTransferId,
                }
              : null,
            items: vo.items.map((item: Elem<typeof vo.items>) => ({
              id: item.id,
              title: item.title,
              quantity: item.quantity,
              lineTotalCents: item.lineTotalCents,
            })),
          })),
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

adminFinanceRouter.post('/orders/:id/refund', async (req: AuthedRequest, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const input = adminRefundSchema.parse(req.body);
    const result = await refundOrder({
      orderId: id,
      actorId: req.user!.sub,
      reason: input.reason,
    });

    const order = await prisma.order.findUniqueOrThrow({
      where: { id },
      include: {
        payment: true,
        vendorOrders: { include: { transfer: true, vendor: true } },
      },
    });

    res.json({
      data: {
        result,
        order: {
          id: order.id,
          status: order.status,
          paymentStatus: order.payment?.status ?? null,
          vendorOrders: order.vendorOrders.map((vo: Elem<typeof order.vendorOrders>) => ({
            id: vo.id,
            status: vo.status,
            vendorId: vo.vendorId,
            transferStatus: vo.transfer?.status ?? null,
            transferAmountCents: vo.transfer?.amountCents ?? null,
          })),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

adminFinanceRouter.get('/audit-logs', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const action = typeof req.query.action === 'string' ? req.query.action : undefined;
    const where = action ? { action: { contains: action } } : {};

    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      data: rows.map((r: Elem<typeof rows>) => ({
        id: r.id,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        meta: r.meta,
        actor: r.actor,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
});

adminFinanceRouter.get('/vendors/:id/ledger', async (req, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const vendor = await prisma.vendorProfile.findUnique({ where: { id } });
    if (!vendor) throw new AppError(404, 'NOT_FOUND', 'Vendor not found');

    const [outstandingDebtCents, entries] = await Promise.all([
      getVendorOutstandingDebtCents(id),
      prisma.vendorLedgerEntry.findMany({
        where: { vendorId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    res.json({
      data: {
        vendorId: id,
        outstandingDebtCents,
        ledgerReviewRequired: vendor.ledgerReviewRequired,
        entries: entries.map((e: Elem<typeof entries>) => ({
          id: e.id,
          kind: e.kind,
          amountCents: e.amountCents,
          currency: e.currency,
          orderId: e.orderId,
          vendorOrderId: e.vendorOrderId,
          note: e.note,
          createdAt: e.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

/** Commission earned by source: rate, per-vendor totals, recent line items. */
adminFinanceRouter.get('/finance', async (_req, res, next) => {
  try {
    let settings = await prisma.platformSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    if (!settings) {
      settings = await prisma.platformSettings.create({ data: {} });
    }

    const commissionStatuses = ['paid', 'fulfilling', 'shipped', 'delivered', 'refunded'] as const;

    const [byVendorRaw, recent, transfersAgg, debtRows] = await Promise.all([
      prisma.vendorOrder.groupBy({
        by: ['vendorId'],
        where: { status: { in: [...commissionStatuses] } },
        _sum: {
          commissionCents: true,
          itemsSubtotalCents: true,
          vendorNetCents: true,
        },
        _count: true,
      }),
      prisma.vendorOrder.findMany({
        where: { status: { in: [...commissionStatuses] } },
        include: {
          vendor: { select: { id: true, displayName: true, slug: true } },
          order: { select: { id: true, status: true, createdAt: true } },
          items: { select: { title: true, quantity: true, lineTotalCents: true } },
          transfer: { select: { status: true, amountCents: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
      prisma.transfer.aggregate({
        where: { status: 'paid' },
        _sum: { amountCents: true },
        _count: true,
      }),
      prisma.vendorLedgerEntry.groupBy({
        by: ['kind'],
        _sum: { amountCents: true },
      }),
    ]);

    const vendorIds = byVendorRaw.map((r: Elem<typeof byVendorRaw>) => r.vendorId);
    const vendors = await prisma.vendorProfile.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, displayName: true, slug: true, ledgerReviewRequired: true },
    });
    const vendorMap = Object.fromEntries(vendors.map((v: Elem<typeof vendors>) => [v.id, v]));

    const debts = await Promise.all(
      vendorIds.map(async (id: Elem<typeof vendorIds>) => [id, await getVendorOutstandingDebtCents(id)] as const),
    );
    const debtMap = Object.fromEntries(debts);

    let debt = 0;
    let offset = 0;
    for (const row of debtRows) {
      const sum = row._sum.amountCents ?? 0;
      if (row.kind === 'refund_debt') debt += sum;
      else if (row.kind === 'debt_offset') offset += sum;
    }

    const byVendor = byVendorRaw
      .map((r: Elem<typeof byVendorRaw>) => {
        const v = vendorMap[r.vendorId];
        return {
          vendorId: r.vendorId,
          displayName: v?.displayName ?? 'Unknown',
          slug: v?.slug ?? '',
          ledgerReviewRequired: v?.ledgerReviewRequired ?? false,
          orderCount: r._count,
          gmvCents: r._sum.itemsSubtotalCents ?? 0,
          commissionCents: r._sum.commissionCents ?? 0,
          vendorNetCents: r._sum.vendorNetCents ?? 0,
          outstandingDebtCents: debtMap[r.vendorId] ?? 0,
        };
      })
      .sort((a, b) => b.commissionCents - a.commissionCents);

    res.json({
      data: {
        settings: {
          commissionBps: settings.commissionBps,
          currency: settings.currency,
          debtReviewThresholdCents: settings.debtReviewThresholdCents,
        },
        totals: {
          platformRevenueCents: byVendor.reduce((n: number, v: Elem<typeof byVendor>) => n + v.commissionCents, 0),
          gmvCents: byVendor.reduce((n: number, v: Elem<typeof byVendor>) => n + v.gmvCents, 0),
          paidOutCents: transfersAgg._sum.amountCents ?? 0,
          paidTransferCount: transfersAgg._count,
          outstandingVendorDebtCents: Math.max(0, debt - offset),
        },
        byVendor,
        recentCommissions: recent.map((vo: Elem<typeof recent>) => ({
          vendorOrderId: vo.id,
          orderId: vo.orderId,
          orderStatus: vo.order.status,
          vendorOrderStatus: vo.status,
          vendor: vo.vendor,
          itemsSubtotalCents: vo.itemsSubtotalCents,
          commissionBps: vo.commissionBps,
          commissionCents: vo.commissionCents,
          vendorNetCents: vo.vendorNetCents,
          transferStatus: vo.transfer?.status ?? null,
          items: vo.items,
          createdAt: vo.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});
