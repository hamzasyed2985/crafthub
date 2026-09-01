import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { parseNamedPagination, parsePagination } from '../../lib/helpers.js';
import { serializeProduct, serializeVendor } from '../../lib/serializers.js';

export const searchRouter = Router();

const productInclude = {
  variants: true,
  media: { orderBy: { sortOrder: 'asc' as const } },
  category: true,
  shop: { include: { vendor: { include: { stripeAccount: true } } } },
} as const;

searchRouter.get('/search', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const shopPage = parseNamedPagination(req.query as Record<string, unknown>, 'shop', limit);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) {
      res.json({
        data: { products: [], shops: [] },
        meta: {
          totalProducts: 0,
          totalShops: 0,
          page,
          limit,
          shopPage: shopPage.page,
          shopLimit: shopPage.limit,
          q: '',
        },
      });
      return;
    }

    const productWhere = {
      status: 'active' as const,
      shop: { vendor: { status: 'approved' as const } },
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
        { shop: { vendor: { displayName: { contains: q, mode: 'insensitive' as const } } } },
        { shop: { vendor: { city: { contains: q, mode: 'insensitive' as const } } } },
        { category: { name: { contains: q, mode: 'insensitive' as const } } },
      ],
    };

    const shopWhere = {
      status: 'approved' as const,
      OR: [
        { displayName: { contains: q, mode: 'insensitive' as const } },
        { bio: { contains: q, mode: 'insensitive' as const } },
        { city: { contains: q, mode: 'insensitive' as const } },
        { slug: { contains: q, mode: 'insensitive' as const } },
      ],
    };

    const [totalProducts, products, totalShops, shops] = await Promise.all([
      prisma.product.count({ where: productWhere }),
      prisma.product.findMany({
        where: productWhere,
        include: productInclude,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.vendorProfile.count({ where: shopWhere }),
      prisma.vendorProfile.findMany({
        where: shopWhere,
        include: { shop: true, stripeAccount: true },
        orderBy: { displayName: 'asc' },
        skip: shopPage.skip,
        take: shopPage.limit,
      }),
    ]);

    res.json({
      data: {
        products: products.map((p) => serializeProduct(p)),
        shops: shops.map((v) => serializeVendor(v)),
      },
      meta: {
        totalProducts,
        totalShops,
        page,
        limit,
        shopPage: shopPage.page,
        shopLimit: shopPage.limit,
        q,
      },
    });
  } catch (err) {
    next(err);
  }
});
