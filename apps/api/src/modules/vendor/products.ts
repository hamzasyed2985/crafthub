import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { addMediaSchema, createProductSchema, updateProductSchema } from '@crafthub/shared';
import { AppError } from '../../lib/errors.js';
import { routeParam, slugify } from '../../lib/helpers.js';
import { productInclude, serializeProduct } from '../../lib/serializers.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireVendor, type VendorRequest } from '../../middleware/vendor.js';

export const vendorProductsRouter = Router({ mergeParams: true });

vendorProductsRouter.use(requireAuth, requireVendor({ requireApproved: true }));

vendorProductsRouter.get('/', async (req: VendorRequest, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { shopId: req.shopId },
      include: productInclude,
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ data: products.map((p) => serializeProduct(p)) });
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

    const media = await prisma.media.create({
      data: {
        productId: product.id,
        url: input.url,
        storageKey: `external:${Buffer.from(input.url).toString('base64url').slice(0, 120)}`,
        alt: input.alt,
        sortOrder: input.sortOrder,
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
