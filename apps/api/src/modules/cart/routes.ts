import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { addCartItemSchema, updateCartItemSchema } from '@crafthub/shared';
import { AppError } from '../../lib/errors.js';
import {
  assertPurchasableVariant,
  ensureCartSessionCookie,
  getOrCreateCart,
  getSerializedCart,
  readCartSessionId,
} from '../../lib/cart.js';
import { routeParam } from '../../lib/helpers.js';
import { optionalAuth } from '../../middleware/optional-auth.js';
import type { AuthedRequest } from '../../middleware/auth.js';

export const cartRouter = Router();

cartRouter.use(optionalAuth);

async function resolveCart(req: AuthedRequest, res: import('express').Response) {
  const guestSession = readCartSessionId(req.cookies, req.headers as Record<string, unknown>);
  if (req.user) {
    const { cartId } = await getOrCreateCart({ userId: req.user.sub });
    return { cartId, sessionId: null as string | null };
  }

  const { cartId, sessionId } = await getOrCreateCart({ sessionId: guestSession });
  if (sessionId) {
    ensureCartSessionCookie(res, sessionId);
  }
  return { cartId, sessionId };
}

cartRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const { cartId, sessionId } = await resolveCart(req, res);
    const cart = await getSerializedCart(cartId);
    res.json({ data: { cart, cartSessionId: sessionId } });
  } catch (err) {
    next(err);
  }
});

cartRouter.post('/items', async (req: AuthedRequest, res, next) => {
  try {
    const input = addCartItemSchema.parse(req.body);
    const { cartId, sessionId } = await resolveCart(req, res);
    const variant = await assertPurchasableVariant(input.variantId);

    const existing = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: { cartId, variantId: input.variantId },
      },
    });

    const nextQty = (existing?.quantity ?? 0) + input.qty;
    if (nextQty > variant.stockQty) {
      throw new AppError(
        400,
        'INSUFFICIENT_STOCK',
        `Only ${variant.stockQty} in stock (you requested ${nextQty}).`,
      );
    }

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: nextQty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId,
          variantId: input.variantId,
          quantity: input.qty,
        },
      });
    }

    const cart = await getSerializedCart(cartId);
    res.status(201).json({ data: { cart, cartSessionId: sessionId } });
  } catch (err) {
    next(err);
  }
});

cartRouter.patch('/items/:id', async (req: AuthedRequest, res, next) => {
  try {
    const itemId = routeParam(req.params.id);
    const input = updateCartItemSchema.parse(req.body);
    const { cartId, sessionId } = await resolveCart(req, res);

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
      include: { variant: true },
    });
    if (!item) throw new AppError(404, 'NOT_FOUND', 'Cart item not found');

    if (input.qty === 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await assertPurchasableVariant(item.variantId);
      if (input.qty > item.variant.stockQty) {
        throw new AppError(
          400,
          'INSUFFICIENT_STOCK',
          `Only ${item.variant.stockQty} in stock.`,
        );
      }
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: input.qty },
      });
    }

    const cart = await getSerializedCart(cartId);
    res.json({ data: { cart, cartSessionId: sessionId } });
  } catch (err) {
    next(err);
  }
});

cartRouter.delete('/items/:id', async (req: AuthedRequest, res, next) => {
  try {
    const itemId = routeParam(req.params.id);
    const { cartId, sessionId } = await resolveCart(req, res);
    const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
    if (!item) throw new AppError(404, 'NOT_FOUND', 'Cart item not found');
    await prisma.cartItem.delete({ where: { id: item.id } });
    const cart = await getSerializedCart(cartId);
    res.json({ data: { cart, cartSessionId: sessionId } });
  } catch (err) {
    next(err);
  }
});

cartRouter.delete('/', async (req: AuthedRequest, res, next) => {
  try {
    const { cartId, sessionId } = await resolveCart(req, res);
    await prisma.cartItem.deleteMany({ where: { cartId } });
    const cart = await getSerializedCart(cartId);
    res.json({ data: { cart, cartSessionId: sessionId } });
  } catch (err) {
    next(err);
  }
});
