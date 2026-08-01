import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { prisma } from '@crafthub/db';
import { AppError } from './errors.js';
import { env } from '../env.js';

export const CART_SESSION_COOKIE = 'cart_session';

const cartItemInclude = {
  variant: {
    include: {
      product: {
        include: {
          media: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
          shop: { include: { vendor: true } },
        },
      },
    },
  },
} as const;

export type CartWarning = { itemId?: string; code: string; message: string };

export function readCartSessionId(
  cookies: Record<string, unknown> | undefined,
  headers?: Record<string, unknown>,
): string | null {
  const headerRaw = headers?.['x-cart-session'] ?? headers?.['X-Cart-Session'];
  if (typeof headerRaw === 'string' && headerRaw.length > 0) return headerRaw;
  const value = cookies?.[CART_SESSION_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function ensureCartSessionCookie(res: Response, sessionId: string) {
  res.cookie(CART_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export async function getOrCreateCart(opts: {
  userId?: string;
  sessionId?: string | null;
}): Promise<{ cartId: string; sessionId: string | null }> {
  if (opts.userId) {
    const existing = await prisma.cart.findUnique({ where: { userId: opts.userId } });
    if (existing) return { cartId: existing.id, sessionId: existing.sessionId };

    const created = await prisma.cart.create({
      data: { userId: opts.userId },
    });
    return { cartId: created.id, sessionId: null };
  }

  const sessionId = opts.sessionId || randomUUID();
  const existing = opts.sessionId
    ? await prisma.cart.findUnique({ where: { sessionId: opts.sessionId } })
    : null;
  if (existing) return { cartId: existing.id, sessionId: existing.sessionId };

  const created = await prisma.cart.create({
    data: { sessionId },
  });
  return { cartId: created.id, sessionId };
}

async function loadCart(cartId: string) {
  return prisma.cart.findUniqueOrThrow({
    where: { id: cartId },
    include: {
      items: {
        include: cartItemInclude,
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

/** Clamp quantities to stock; drop unavailable lines; return warnings. */
export async function reconcileCart(cartId: string): Promise<CartWarning[]> {
  const cart = await loadCart(cartId);
  const warnings: CartWarning[] = [];

  for (const item of cart.items) {
    const { variant } = item;
    const product = variant.product;
    const vendorOk = product.shop.vendor.status === 'approved';
    const productOk = product.status === 'active';

    if (!vendorOk || !productOk || variant.stockQty <= 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
      warnings.push({
        itemId: item.id,
        code: 'REMOVED',
        message: `${product.title} was removed (unavailable or out of stock).`,
      });
      continue;
    }

    if (item.quantity > variant.stockQty) {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: variant.stockQty },
      });
      warnings.push({
        itemId: item.id,
        code: 'STOCK_CLAMPED',
        message: `${product.title} quantity reduced to ${variant.stockQty} (stock limit).`,
      });
    }
  }

  return warnings;
}

export function serializeCart(
  cart: Awaited<ReturnType<typeof loadCart>>,
  warnings: CartWarning[] = [],
) {
  type Group = {
    vendor: {
      id: string;
      displayName: string;
      slug: string;
      city: string | null;
    };
    shop: {
      id: string;
      flatShippingCents: number;
      shipsFromCity: string | null;
    };
    items: Array<{
      id: string;
      quantity: number;
      lineTotalCents: number;
      variant: {
        id: string;
        priceCents: number;
        currency: string;
        stockQty: number;
        sku: string | null;
      };
      product: {
        id: string;
        title: string;
        slug: string;
        imageUrl: string | null;
      };
    }>;
    subtotalCents: number;
    shippingCents: number;
    vendorTotalCents: number;
  };

  const groupsMap = new Map<string, Group>();

  for (const item of cart.items) {
    const product = item.variant.product;
    const vendor = product.shop.vendor;
    const shop = product.shop;
    const key = vendor.id;
    let group = groupsMap.get(key);
    if (!group) {
      group = {
        vendor: {
          id: vendor.id,
          displayName: vendor.displayName,
          slug: vendor.slug,
          city: vendor.city,
        },
        shop: {
          id: shop.id,
          flatShippingCents: shop.flatShippingCents,
          shipsFromCity: shop.shipsFromCity,
        },
        items: [],
        subtotalCents: 0,
        shippingCents: shop.flatShippingCents,
        vendorTotalCents: 0,
      };
      groupsMap.set(key, group);
    }

    const lineTotalCents = item.variant.priceCents * item.quantity;
    group.items.push({
      id: item.id,
      quantity: item.quantity,
      lineTotalCents,
      variant: {
        id: item.variant.id,
        priceCents: item.variant.priceCents,
        currency: item.variant.currency,
        stockQty: item.variant.stockQty,
        sku: item.variant.sku,
      },
      product: {
        id: product.id,
        title: product.title,
        slug: product.slug,
        imageUrl: product.media[0]?.url ?? null,
      },
    });
    group.subtotalCents += lineTotalCents;
  }

  const groups = [...groupsMap.values()].map((g) => ({
    ...g,
    shippingCents: g.items.length > 0 ? g.shop.flatShippingCents : 0,
    vendorTotalCents: g.subtotalCents + (g.items.length > 0 ? g.shop.flatShippingCents : 0),
  }));

  const itemsSubtotalCents = groups.reduce((sum, g) => sum + g.subtotalCents, 0);
  const shippingTotalCents = groups.reduce((sum, g) => sum + g.shippingCents, 0);
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    id: cart.id,
    itemCount,
    currency: 'USD',
    groups,
    itemsSubtotalCents,
    shippingTotalCents,
    totalCents: itemsSubtotalCents + shippingTotalCents,
    warnings,
  };
}

export async function getSerializedCart(cartId: string) {
  const warnings = await reconcileCart(cartId);
  const cart = await loadCart(cartId);
  return serializeCart(cart, warnings);
}

export async function assertPurchasableVariant(variantId: string) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: { include: { shop: { include: { vendor: true } } } },
    },
  });

  if (!variant) {
    throw new AppError(404, 'VARIANT_NOT_FOUND', 'Variant not found');
  }
  if (variant.product.status !== 'active') {
    throw new AppError(400, 'PRODUCT_UNAVAILABLE', 'This product is not available');
  }
  if (variant.product.shop.vendor.status !== 'approved') {
    throw new AppError(400, 'SHOP_UNAVAILABLE', 'This shop is not available');
  }
  if (variant.stockQty <= 0) {
    throw new AppError(400, 'OUT_OF_STOCK', 'This item is out of stock');
  }

  return variant;
}

export async function mergeGuestCartIntoUser(opts: {
  userId: string;
  guestSessionId: string | null;
}) {
  if (!opts.guestSessionId) return;

  const guest = await prisma.cart.findUnique({
    where: { sessionId: opts.guestSessionId },
    include: { items: true },
  });
  if (!guest || guest.items.length === 0) {
    if (guest) await prisma.cart.delete({ where: { id: guest.id } }).catch(() => undefined);
    return;
  }

  const { cartId: userCartId } = await getOrCreateCart({ userId: opts.userId });

  for (const item of guest.items) {
    try {
      const variant = await assertPurchasableVariant(item.variantId);
      const existing = await prisma.cartItem.findUnique({
        where: {
          cartId_variantId: { cartId: userCartId, variantId: item.variantId },
        },
      });
      const nextQty = Math.min(
        variant.stockQty,
        (existing?.quantity ?? 0) + item.quantity,
      );
      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: nextQty },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: userCartId,
            variantId: item.variantId,
            quantity: nextQty,
          },
        });
      }
    } catch {
      // skip unavailable guest lines
    }
  }

  await prisma.cart.delete({ where: { id: guest.id } }).catch(() => undefined);
}
