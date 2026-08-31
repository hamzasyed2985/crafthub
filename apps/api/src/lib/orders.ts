import { prisma, type Prisma } from '@crafthub/db';
import {
  computeCommission,
  COMMISSION_BPS_DEFAULT,
  type VendorOrderStatus,
} from '@crafthub/shared';
import type { ShippingAddressInput } from '@crafthub/shared';
import { AppError } from './errors.js';
import { env } from '../env.js';

export const orderInclude = {
  vendorOrders: {
    include: {
      vendor: { select: { id: true, displayName: true, slug: true } },
      items: true,
      transfer: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
  payment: true,
} as const;

type OrderLoaded = Awaited<
  ReturnType<
    typeof prisma.order.findFirstOrThrow<{ include: typeof orderInclude }>
  >
>;

export function serializeOrder(order: OrderLoaded) {
  return {
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
    payment: order.payment
      ? {
          status: order.payment.status,
          amountCents: order.payment.amountCents,
          checkoutSessionId: order.payment.checkoutSessionId,
          paymentIntentId: order.payment.paymentIntentId,
        }
      : null,
    vendorOrders: order.vendorOrders.map((vo) => ({
      id: vo.id,
      status: vo.status,
      vendor: vo.vendor,
      itemsSubtotalCents: vo.itemsSubtotalCents,
      shippingCents: vo.shippingCents,
      commissionBps: vo.commissionBps,
      commissionCents: vo.commissionCents,
      vendorNetCents: vo.vendorNetCents,
      trackingNumber: vo.trackingNumber,
      carrier: vo.carrier,
      shippedAt: vo.shippedAt?.toISOString() ?? null,
      fulfillingAt: vo.fulfillingAt?.toISOString() ?? null,
      items: vo.items.map((item) => ({
        id: item.id,
        title: item.title,
        productSlug: item.productSlug,
        sku: item.sku,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        lineTotalCents: item.lineTotalCents,
        attributes: item.attributes,
      })),
      transfer: vo.transfer
        ? {
            id: vo.transfer.id,
            status: vo.transfer.status,
            amountCents: vo.transfer.amountCents,
            stripeTransferId: vo.transfer.stripeTransferId,
          }
        : null,
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export async function getPlatformCommissionBps(): Promise<number> {
  const settings = await prisma.platformSettings.findFirst({
    orderBy: { updatedAt: 'desc' },
  });
  return settings?.commissionBps ?? COMMISSION_BPS_DEFAULT;
}

type CheckoutLine = {
  variantId: string;
  quantity: number;
  unitPriceCents: number;
  currency: string;
  sku: string | null;
  title: string;
  productSlug: string;
  productId: string;
  attributes: unknown;
  stockQty: number;
  vendorId: string;
  vendorSlug: string;
  vendorDisplayName: string;
  shopId: string;
  flatShippingCents: number;
  chargesEnabled: boolean;
  stripeAccountId: string | null;
};

/** Load buyer cart lines and validate purchasability for checkout. */
export async function loadCheckoutLines(userId: string): Promise<CheckoutLine[]> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  shop: {
                    include: {
                      vendor: { include: { stripeAccount: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new AppError(400, 'CART_EMPTY', 'Your cart is empty');
  }

  const lines: CheckoutLine[] = [];
  for (const item of cart.items) {
    const { variant } = item;
    const product = variant.product;
    const vendor = product.shop.vendor;
    const stripe = vendor.stripeAccount;

    if (product.status !== 'active') {
      throw new AppError(400, 'PRODUCT_UNAVAILABLE', `${product.title} is not available`);
    }
    if (vendor.status !== 'approved') {
      throw new AppError(400, 'SHOP_UNAVAILABLE', `${vendor.displayName} is not available`);
    }
    if (!stripe?.chargesEnabled) {
      throw new AppError(
        400,
        'VENDOR_NOT_PAYABLE',
        `${vendor.displayName} has not completed Stripe onboarding yet`,
      );
    }
    if (variant.stockQty < item.quantity) {
      throw new AppError(
        400,
        'INSUFFICIENT_STOCK',
        `Only ${variant.stockQty} of ${product.title} left in stock`,
      );
    }

    lines.push({
      variantId: variant.id,
      quantity: item.quantity,
      unitPriceCents: variant.priceCents,
      currency: variant.currency,
      sku: variant.sku,
      title: product.title,
      productSlug: product.slug,
      productId: product.id,
      attributes: variant.attributes,
      stockQty: variant.stockQty,
      vendorId: vendor.id,
      vendorSlug: vendor.slug,
      vendorDisplayName: vendor.displayName,
      shopId: product.shop.id,
      flatShippingCents: product.shop.flatShippingCents,
      chargesEnabled: stripe.chargesEnabled,
      stripeAccountId: stripe.stripeAccountId,
    });
  }

  return lines;
}

export function groupLinesByVendor(lines: CheckoutLine[]) {
  const map = new Map<string, CheckoutLine[]>();
  for (const line of lines) {
    const list = map.get(line.vendorId) ?? [];
    list.push(line);
    map.set(line.vendorId, list);
  }
  return map;
}

export async function createOrderFromCart(opts: {
  buyerId: string;
  shipping: ShippingAddressInput;
  idempotencyKey?: string | null;
  saveAddress?: boolean;
}) {
  if (opts.idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey: opts.idempotencyKey },
      include: orderInclude,
    });
    if (existing) {
      if (existing.buyerId !== opts.buyerId) {
        throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'Idempotency key already used');
      }
      return existing;
    }
  }

  const lines = await loadCheckoutLines(opts.buyerId);
  const commissionBps = await getPlatformCommissionBps();
  const byVendor = groupLinesByVendor(lines);
  const expiresAt = new Date(Date.now() + env.RESERVATION_TTL_MINUTES * 60_000);

  const order = await prisma.$transaction(async (tx) => {
    // Re-check stock under transaction and create reservations atomically.
    for (const line of lines) {
      const variant = await tx.productVariant.findUniqueOrThrow({
        where: { id: line.variantId },
      });
      const reserved = await tx.inventoryReservation.aggregate({
        where: {
          variantId: line.variantId,
          expiresAt: { gt: new Date() },
          order: { status: 'pending_payment' },
        },
        _sum: { quantity: true },
      });
      const reservedQty = reserved._sum.quantity ?? 0;
      const available = variant.stockQty - reservedQty;
      if (available < line.quantity) {
        throw new AppError(
          400,
          'INSUFFICIENT_STOCK',
          `Not enough stock for ${line.title} (available ${Math.max(0, available)})`,
        );
      }
    }

    let itemsSubtotalCents = 0;
    let shippingTotalCents = 0;
    let commissionTotalCents = 0;

    const vendorSlices: Array<{
      vendorId: string;
      itemsSubtotalCents: number;
      shippingCents: number;
      commissionCents: number;
      vendorNetCents: number;
      items: CheckoutLine[];
    }> = [];

    for (const [vendorId, vendorLines] of byVendor) {
      const itemsSub = vendorLines.reduce(
        (sum, l) => sum + l.unitPriceCents * l.quantity,
        0,
      );
      const shippingCents = vendorLines[0]!.flatShippingCents;
      const commissionCents = computeCommission(itemsSub, commissionBps);
      const vendorNetCents = itemsSub - commissionCents + shippingCents;
      itemsSubtotalCents += itemsSub;
      shippingTotalCents += shippingCents;
      commissionTotalCents += commissionCents;
      vendorSlices.push({
        vendorId,
        itemsSubtotalCents: itemsSub,
        shippingCents,
        commissionCents,
        vendorNetCents,
        items: vendorLines,
      });
    }

    const created = await tx.order.create({
      data: {
        buyerId: opts.buyerId,
        status: 'pending_payment',
        currency: lines[0]!.currency,
        itemsSubtotalCents,
        shippingTotalCents,
        totalCents: itemsSubtotalCents + shippingTotalCents,
        commissionTotalCents,
        idempotencyKey: opts.idempotencyKey ?? null,
        shipName: opts.shipping.name,
        shipLine1: opts.shipping.line1,
        shipLine2: opts.shipping.line2 ?? null,
        shipCity: opts.shipping.city,
        shipRegion: opts.shipping.region ?? null,
        shipPostalCode: opts.shipping.postalCode,
        shipCountry: opts.shipping.country,
        vendorOrders: {
          create: vendorSlices.map((slice) => ({
            vendorId: slice.vendorId,
            status: 'awaiting_payment' as const,
            itemsSubtotalCents: slice.itemsSubtotalCents,
            shippingCents: slice.shippingCents,
            commissionBps,
            commissionCents: slice.commissionCents,
            vendorNetCents: slice.vendorNetCents,
            items: {
              create: slice.items.map((item) => ({
                variantId: item.variantId,
                productId: item.productId,
                title: item.title,
                productSlug: item.productSlug,
                sku: item.sku,
                unitPriceCents: item.unitPriceCents,
                quantity: item.quantity,
                lineTotalCents: item.unitPriceCents * item.quantity,
                attributes: (item.attributes ?? {}) as object,
              })),
            },
          })),
        },
        reservations: {
          create: lines.map((line) => ({
            variantId: line.variantId,
            quantity: line.quantity,
            expiresAt,
          })),
        },
      },
      include: orderInclude,
    });

    if (opts.saveAddress) {
      await tx.address.create({
        data: {
          userId: opts.buyerId,
          name: opts.shipping.name,
          line1: opts.shipping.line1,
          line2: opts.shipping.line2 ?? null,
          city: opts.shipping.city,
          region: opts.shipping.region ?? null,
          postalCode: opts.shipping.postalCode,
          country: opts.shipping.country,
        },
      });
    }

    return created;
  });

  return order;
}

export async function releaseOrderReservations(orderId: string) {
  await prisma.inventoryReservation.deleteMany({ where: { orderId } });
}

/** Cancel pending_payment order and free reservations. */
export async function cancelPendingOrder(orderId: string, reason: string) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== 'pending_payment') return;

    await tx.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
    });
    await tx.vendorOrder.updateMany({
      where: { orderId },
      data: { status: 'cancelled' },
    });
    await tx.payment.updateMany({
      where: { orderId, status: 'pending' },
      data: { status: 'cancelled' },
    });
    await tx.inventoryReservation.deleteMany({ where: { orderId } });
    await tx.auditLog.create({
      data: {
        action: 'order.cancelled',
        entity: 'order',
        entityId: orderId,
        meta: { reason },
      },
    });
  });
}

/** Expire reservations past TTL and cancel their pending orders. */
export async function expireReservations() {
  const expired = await prisma.inventoryReservation.findMany({
    where: { expiresAt: { lte: new Date() } },
    select: { orderId: true },
    distinct: ['orderId'],
  });

  for (const row of expired) {
    await cancelPendingOrder(row.orderId, 'reservation_expired');
  }

  return expired.length;
}

function isVendorSliceFulfilled(status: VendorOrderStatus): boolean {
  switch (status) {
    case 'shipped':
    case 'delivered':
      return true;
    case 'awaiting_payment':
    case 'paid':
    case 'fulfilling':
    case 'cancelled':
    case 'refunded':
      return false;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function isVendorSliceInactive(status: VendorOrderStatus): boolean {
  return status === 'cancelled' || status === 'refunded';
}

/**
 * Keep parent Order status in sync with vendor slice fulfillment.
 * - Any active slice in progress → processing (from paid)
 * - All active slices shipped/delivered → completed
 */
export async function syncParentOrderFulfillmentStatus(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { vendorOrders: { select: { status: true } } },
  });
  if (!order) return;

  if (
    order.status === 'pending_payment' ||
    order.status === 'cancelled' ||
    order.status === 'refunded'
  ) {
    return;
  }

  const activeSlices = order.vendorOrders.filter((vo) => !isVendorSliceInactive(vo.status));
  if (activeSlices.length === 0) return;

  const allFulfilled = activeSlices.every((vo) => isVendorSliceFulfilled(vo.status));

  if (allFulfilled) {
    if (order.status !== 'completed') {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'completed' },
      });
    }
    return;
  }

  const anyStarted =
    activeSlices.some((vo) => isVendorSliceFulfilled(vo.status)) ||
    activeSlices.some((vo) => vo.status === 'fulfilling');

  if (anyStarted || activeSlices.some((vo) => vo.status === 'paid')) {
    if (order.status === 'paid') {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'processing' },
      });
    }
  }
}
