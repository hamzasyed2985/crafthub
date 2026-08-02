import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { createReviewSchema } from '@crafthub/shared';
import { AppError } from '../../lib/errors.js';
import { parsePagination, routeParam } from '../../lib/helpers.js';
import { requireAuth, type AuthedRequest } from '../../middleware/auth.js';

export const reviewsRouter = Router();

function serializeReview(r: {
  id: string;
  rating: number;
  body: string;
  verifiedPurchase: boolean;
  createdAt: Date;
  user: { id: string; name: string | null };
}) {
  return {
    id: r.id,
    rating: r.rating,
    body: r.body,
    verifiedPurchase: r.verifiedPurchase,
    user: { id: r.user.id, name: r.user.name ?? 'Buyer' },
    createdAt: r.createdAt.toISOString(),
  };
}

/** Public: list reviews for a product */
reviewsRouter.get('/products/:productId/reviews', async (req, res, next) => {
  try {
    const productId = routeParam(req.params.productId, 'productId');
    const { page, limit, skip } = parsePagination(req.query);

    const product = await prisma.product.findFirst({
      where: { id: productId, status: 'active' },
      select: { id: true },
    });
    if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');

    const [total, rows, agg] = await Promise.all([
      prisma.review.count({ where: { productId } }),
      prisma.review.findMany({
        where: { productId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    res.json({
      data: rows.map(serializeReview),
      meta: {
        total,
        page,
        limit,
        averageRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
        reviewCount: agg._count,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** Auth: create review after verified purchase (shipped/delivered) */
reviewsRouter.post(
  '/products/:productId/reviews',
  requireAuth,
  async (req: AuthedRequest, res, next) => {
    try {
      const productId = routeParam(req.params.productId, 'productId');
      const input = createReviewSchema.parse(req.body);
      const userId = req.user!.sub;

      const product = await prisma.product.findFirst({
        where: { id: productId, status: 'active' },
        select: { id: true },
      });
      if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');

      const purchased = await prisma.orderItem.findFirst({
        where: {
          productId,
          vendorOrder: {
            status: { in: ['shipped', 'delivered'] },
            order: { buyerId: userId, status: { in: ['paid', 'processing', 'completed'] } },
          },
        },
      });
      if (!purchased) {
        throw new AppError(
          403,
          'NOT_ELIGIBLE',
          'You can review after a purchased item has shipped',
        );
      }

      const existing = await prisma.review.findUnique({
        where: { productId_userId: { productId, userId } },
      });
      if (existing) {
        throw new AppError(409, 'ALREADY_REVIEWED', 'You already reviewed this product');
      }

      const review = await prisma.review.create({
        data: {
          productId,
          userId,
          rating: input.rating,
          body: input.body ?? '',
          verifiedPurchase: true,
        },
        include: { user: { select: { id: true, name: true } } },
      });

      res.status(201).json({ data: { review: serializeReview(review) } });
    } catch (err) {
      next(err);
    }
  },
);
