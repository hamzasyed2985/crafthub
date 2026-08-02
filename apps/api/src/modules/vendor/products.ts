import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { addMediaSchema, createProductSchema, updateProductSchema } from '@crafthub/shared';
import { AppError } from '../../lib/errors.js';
import { parsePagination, routeParam, slugify } from '../../lib/helpers.js';
import { productInclude, serializeProduct } from '../../lib/serializers.js';
import { enqueueProductEmbedding } from '../../lib/queue.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireVendor, type VendorRequest } from '../../middleware/vendor.js';
import { upsertProductEmbedding } from '../ai/reindex.js';

export const vendorProductsRouter = Router({ mergeParams: true });

vendorProductsRouter.use(requireAuth, requireVendor({ requireApproved: true }));

vendorProductsRouter.get('/', async (req: VendorRequest, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const where = {
      shopId: req.shopId,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' as const } },
              { slug: { contains: q, mode: 'insensitive' as const } },
              { description: { contains: q, mode: 'insensitive' as const } },
              { variants: { some: { sku: { contains: q, mode: 'insensitive' as const } } } },
            ],
          }
        : {}),
    };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);
    res.json({
      data: products.map((p) => serializeProduct(p)),
      meta: { total, page, limit, q },
    });
  } catch (err) {
    next(err);
  }
});

vendorProductsRouter.post('/', async (req: VendorRequest, res, next) => {
  try {
    const input = createProductSchema.parse(req.body);
    if (!req.shopId) {
      throw new AppError(400, 'NO_SHOP', 'Shop not found');
    }

    const slug = input.slug ?? slugify(input.title);
    if (!slug) {
      throw new AppError(400, 'INVALID_SLUG', 'Could not derive a product slug');
    }

    const clash = await prisma.product.findUnique({
      where: { shopId_slug: { shopId: req.shopId, slug } },
    });
    if (clash) {
      throw new AppError(409, 'SLUG_TAKEN', 'A product with this slug already exists in your shop');
    }

    if (input.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
      if (!category) throw new AppError(400, 'INVALID_CATEGORY', 'Category not found');
    }

    const product = await prisma.product.create({
      data: {
        shopId: req.shopId,
        title: input.title,
        slug,
        description: input.description,
        categoryId: input.categoryId ?? null,
        status: input.status,
        variants: {
          create: input.variants.map((v) => ({
            sku: v.sku,
            priceCents: v.priceCents,
            currency: v.currency,
            stockQty: v.stockQty,
            attributes: v.attributes,
          })),
        },
      },
      include: productInclude,
    });

    void enqueueProductEmbedding(product.id);
    void upsertProductEmbedding(product.id).catch(() => undefined);

    res.status(201).json({ data: { product: serializeProduct(product) } });
  } catch (err) {
    next(err);
  }
});

vendorProductsRouter.get('/:id', async (req: VendorRequest, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const product = await prisma.product.findFirst({
      where: { id, shopId: req.shopId },
      include: productInclude,
    });
    if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
    res.json({ data: { product: serializeProduct(product) } });
  } catch (err) {
    next(err);
  }
});

vendorProductsRouter.patch('/:id', async (req: VendorRequest, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const input = updateProductSchema.parse(req.body);
    const existing = await prisma.product.findFirst({
      where: { id, shopId: req.shopId },
      include: { variants: true },
    });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Product not found');

    if (input.slug && input.slug !== existing.slug) {
      const clash = await prisma.product.findUnique({
        where: { shopId_slug: { shopId: req.shopId!, slug: input.slug } },
      });
      if (clash) throw new AppError(409, 'SLUG_TAKEN', 'Slug already in use');
    }

    const product = await prisma.$transaction(async (tx) => {
      if (input.variants) {
        await tx.productVariant.deleteMany({ where: { productId: existing.id } });
        await tx.productVariant.createMany({
          data: input.variants.map((v) => ({
            productId: existing.id,
            sku: v.sku,
            priceCents: v.priceCents,
            currency: v.currency ?? 'USD',
            stockQty: v.stockQty ?? 0,
            attributes: v.attributes ?? {},
          })),
        });
      }

      return tx.product.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          slug: input.slug,
          description: input.description,
          categoryId: input.categoryId === undefined ? undefined : input.categoryId,
          status: input.status,
        },
        include: productInclude,
      });
    });

    void enqueueProductEmbedding(product.id);
    void upsertProductEmbedding(product.id).catch(() => undefined);

    res.json({ data: { product: serializeProduct(product) } });
  } catch (err) {
    next(err);
  }
});

vendorProductsRouter.delete('/:id', async (req: VendorRequest, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const existing = await prisma.product.findFirst({
      where: { id, shopId: req.shopId },
    });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Product not found');

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: { status: 'archived' },
      include: productInclude,
    });

    res.json({ data: { product: serializeProduct(product) } });
  } catch (err) {
    next(err);
  }
});

/** Phase 1: attach image by URL (R2 signed uploads come later). */
vendorProductsRouter.post('/:id/media', async (req: VendorRequest, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const input = addMediaSchema.parse(req.body);
    const product = await prisma.product.findFirst({
      where: { id, shopId: req.shopId },
    });
    if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');

    const maxSort = await prisma.media.aggregate({
      where: { productId: product.id },
      _max: { sortOrder: true },
    });
    const sortOrder =
      input.sortOrder !== undefined ? input.sortOrder : (maxSort._max.sortOrder ?? -1) + 1;

    const media = await prisma.media.create({
      data: {
        productId: product.id,
        url: input.url,
        storageKey: `external:${Buffer.from(input.url).toString('base64url').slice(0, 120)}`,
        alt: input.alt,
        sortOrder,
      },
    });

    res.status(201).json({
      data: {
        media: {
          id: media.id,
          url: media.url,
          alt: media.alt,
          sortOrder: media.sortOrder,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

vendorProductsRouter.delete('/:id/media/:mediaId', async (req: VendorRequest, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const mediaId = routeParam(req.params.mediaId);
    const product = await prisma.product.findFirst({
      where: { id, shopId: req.shopId },
    });
    if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');

    const media = await prisma.media.findFirst({
      where: { id: mediaId, productId: product.id },
    });
    if (!media) throw new AppError(404, 'NOT_FOUND', 'Media not found');

    await prisma.media.delete({ where: { id: media.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
