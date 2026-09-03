import { Router } from 'express';
import { prisma, Prisma } from '@crafthub/db';
import { AppError } from '../../lib/errors.js';
import { parsePagination, routeParam } from '../../lib/helpers.js';
import { fetchProductIdsByMinVariantPrice } from '../../lib/catalog-products.js';
import { productInclude, serializeProduct } from '../../lib/serializers.js';

export const catalogRouter = Router();

type CatalogProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

catalogRouter.get('/categories', async (req, res, next) => {
  try {
    const featuredOnly =
      req.query.featured === '1' || req.query.featured === 'true';
    const categories = await prisma.category.findMany({
      where: {
        status: 'active',
        ...(featuredOnly ? { featured: true } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        featured: true,
        sortOrder: true,
      },
    });
    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/shops', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';

    const where = {
      status: 'approved' as const,
      ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
      ...(q
        ? {
            OR: [
              { displayName: { contains: q, mode: 'insensitive' as const } },
              { bio: { contains: q, mode: 'insensitive' as const } },
              { craftTags: { has: q } },
            ],
          }
        : {}),
    };

    const [total, vendors] = await Promise.all([
      prisma.vendorProfile.count({ where }),
      prisma.vendorProfile.findMany({
        where,
        include: { shop: true },
        orderBy: { displayName: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      data: vendors.map((v) => ({
        id: v.id,
        displayName: v.displayName,
        slug: v.slug,
        bio: v.bio,
        logoUrl: v.logoUrl,
        bannerUrl: v.bannerUrl,
        city: v.city,
        craftTags: v.craftTags,
        flatShippingCents: v.shop?.flatShippingCents ?? 0,
      })),
      meta: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/shops/:slug', async (req, res, next) => {
  try {
    const slug = routeParam(req.params.slug, 'slug');
    const { page, limit, skip } = parsePagination(req.query);
    const vendor = await prisma.vendorProfile.findFirst({
      where: { slug, status: 'approved' },
      include: { shop: true, stripeAccount: true },
    });
    if (!vendor || !vendor.shop) {
      throw new AppError(404, 'NOT_FOUND', 'Shop not found');
    }

    const productWhere = { shopId: vendor.shop.id, status: 'active' as const };
    const [total, products] = await Promise.all([
      prisma.product.count({ where: productWhere }),
      prisma.product.findMany({
        where: productWhere,
        include: productInclude,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      data: {
        shop: {
          id: vendor.shop.id,
          displayName: vendor.displayName,
          slug: vendor.slug,
          bio: vendor.bio,
          logoUrl: vendor.logoUrl,
          bannerUrl: vendor.bannerUrl,
          city: vendor.city,
          craftTags: vendor.craftTags,
          shippingPolicy: vendor.shop.shippingPolicy,
          returnsPolicy: vendor.shop.returnsPolicy,
          flatShippingCents: vendor.shop.flatShippingCents,
          shipsFromCity: vendor.shop.shipsFromCity,
          chargesEnabled: Boolean(vendor.stripeAccount?.chargesEnabled),
        },
        products: products.map((p) => serializeProduct(p)),
      },
      meta: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/shops/:slug/products/:productSlug', async (req, res, next) => {
  try {
    const slug = routeParam(req.params.slug, 'slug');
    const productSlug = routeParam(req.params.productSlug, 'productSlug');
    const vendor = await prisma.vendorProfile.findFirst({
      where: { slug, status: 'approved' },
      include: { shop: true, stripeAccount: true },
    });
    if (!vendor?.shop) throw new AppError(404, 'NOT_FOUND', 'Shop not found');

    const product = await prisma.product.findFirst({
      where: {
        shopId: vendor.shop.id,
        slug: productSlug,
        status: 'active',
      },
      include: productInclude,
    });
    if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');

    res.json({
      data: {
        shop: {
          displayName: vendor.displayName,
          slug: vendor.slug,
          flatShippingCents: vendor.shop.flatShippingCents,
          chargesEnabled: Boolean(vendor.stripeAccount?.chargesEnabled),
        },
        product: serializeProduct(product),
      },
    });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/products', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const shopSlug = typeof req.query.shop === 'string' ? req.query.shop.trim() : '';
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const sortRaw = typeof req.query.sort === 'string' ? req.query.sort.trim() : 'newest';
    const sort =
      sortRaw === 'price_asc' ||
      sortRaw === 'price_desc' ||
      sortRaw === 'title' ||
      sortRaw === 'newest'
        ? sortRaw
        : 'newest';

    const where = {
      status: 'active' as const,
      shop: {
        vendor: {
          status: 'approved' as const,
          ...(shopSlug ? { slug: shopSlug } : {}),
        },
      },
      ...(category ? { category: { slug: category } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' as const } },
              { description: { contains: q, mode: 'insensitive' as const } },
              {
                shop: {
                  vendor: { displayName: { contains: q, mode: 'insensitive' as const } },
                },
              },
              {
                shop: {
                  vendor: { city: { contains: q, mode: 'insensitive' as const } },
                },
              },
            ],
          }
        : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            variants: {
              some: {
                priceCents: {
                  ...(minPrice !== undefined && !Number.isNaN(minPrice) ? { gte: minPrice } : {}),
                  ...(maxPrice !== undefined && !Number.isNaN(maxPrice) ? { lte: maxPrice } : {}),
                },
              },
            },
          }
        : {}),
    };

    const total = await prisma.product.count({ where });

    let products: CatalogProductRow[];
    if (sort === 'price_asc' || sort === 'price_desc') {
      const ids = await fetchProductIdsByMinVariantPrice(
        {
          q: q || undefined,
          category: category || undefined,
          shopSlug: shopSlug || undefined,
          minPrice,
          maxPrice,
        },
        sort,
        skip,
        limit,
      );
      if (ids.length === 0) {
        products = [];
      } else {
        const rows = await prisma.product.findMany({
          where: { id: { in: ids } },
          include: productInclude,
        });
        const order = new Map(ids.map((id, index) => [id, index]));
        products = rows.sort(
          (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
        );
      }
    } else {
      products = await prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: sort === 'title' ? { title: 'asc' } : { updatedAt: 'desc' },
        skip,
        take: limit,
      });
    }

    res.json({
      data: products.map((p) => serializeProduct(p)),
      meta: {
        total,
        page,
        limit,
        q,
        category,
        shop: shopSlug,
        minPrice: minPrice !== undefined && !Number.isNaN(minPrice) ? minPrice : undefined,
        maxPrice: maxPrice !== undefined && !Number.isNaN(maxPrice) ? maxPrice : undefined,
        sort,
      },
    });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/products/:id', async (req, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const product = await prisma.product.findFirst({
      where: {
        id,
        status: 'active',
        shop: { vendor: { status: 'approved' } },
      },
      include: productInclude,
    });
    if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
    res.json({ data: { product: serializeProduct(product) } });
  } catch (err) {
    next(err);
  }
});
