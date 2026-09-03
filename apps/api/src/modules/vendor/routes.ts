import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { suggestCategorySchema, updateShopSchema, vendorApplySchema } from '@crafthub/shared';
import { AppError } from '../../lib/errors.js';
import {
  createRefreshToken,
  signAccessToken,
} from '../../lib/auth-tokens.js';
import { setAuthCookies } from '../../lib/cookies.js';
import { serializeVendor } from '../../lib/serializers.js';
import { requireAuth, type AuthedRequest } from '../../middleware/auth.js';
import { requireVendor, type VendorRequest } from '../../middleware/vendor.js';

export const vendorRouter = Router();

vendorRouter.use(requireAuth);

async function issueSession(user: {
  id: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
}) {
  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const refresh = createRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refresh.hash,
      expiresAt: refresh.expiresAt,
    },
  });
  return { accessToken, refreshToken: refresh.raw };
}

vendorRouter.post('/apply', async (req: AuthedRequest, res, next) => {
  try {
    const input = vendorApplySchema.parse(req.body);
    const userId = req.user!.sub;

    const existing = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (existing) {
      throw new AppError(409, 'ALREADY_APPLIED', 'You already have a vendor profile');
    }

    const slugTaken = await prisma.vendorProfile.findUnique({ where: { slug: input.slug } });
    if (slugTaken) {
      throw new AppError(409, 'SLUG_TAKEN', 'This shop slug is already taken');
    }

    const vendor = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { role: 'vendor' },
      });

      const profile = await tx.vendorProfile.create({
        data: {
          userId,
          displayName: input.displayName,
          slug: input.slug,
          bio: input.bio,
          city: input.city,
          craftTags: input.craftTags,
          status: 'pending',
          shop: {
            create: {
              shipsFromCity: input.city,
              flatShippingCents: 500,
            },
          },
          stripeAccount: {
            create: {},
          },
        },
        include: { shop: true, stripeAccount: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'vendor.apply',
          entity: 'vendor_profile',
          entityId: profile.id,
          meta: {
            slug: profile.slug,
            city: profile.city,
            displayName: profile.displayName,
          },
        },
      });

      return profile;
    });

    // Re-issue token so role claim matches vendor
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const tokens = await issueSession(user);
    setAuthCookies(res, tokens);

    res.status(201).json({
      data: {
        vendor: serializeVendor(vendor),
        accessToken: tokens.accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt.toISOString(),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

vendorRouter.get('/me', requireVendor(), async (req: VendorRequest, res, next) => {
  try {
    const vendor = await prisma.vendorProfile.findUniqueOrThrow({
      where: { id: req.vendorId },
      include: { shop: true, stripeAccount: true },
    });
    res.json({ data: { vendor: serializeVendor(vendor) } });
  } catch (err) {
    next(err);
  }
});

vendorRouter.patch('/shop', requireVendor(), async (req: VendorRequest, res, next) => {
  try {
    const input = updateShopSchema.parse(req.body);

    const vendor = await prisma.$transaction(async (tx) => {
      await tx.vendorProfile.update({
        where: { id: req.vendorId },
        data: {
          displayName: input.displayName,
          bio: input.bio,
          city: input.city,
          logoUrl: input.logoUrl === undefined ? undefined : input.logoUrl,
          bannerUrl: input.bannerUrl === undefined ? undefined : input.bannerUrl,
          craftTags: input.craftTags,
        },
      });

      if (req.shopId) {
        await tx.shop.update({
          where: { id: req.shopId },
          data: {
            shippingPolicy: input.shippingPolicy === undefined ? undefined : input.shippingPolicy,
            returnsPolicy: input.returnsPolicy === undefined ? undefined : input.returnsPolicy,
            flatShippingCents: input.flatShippingCents,
            shipsFromCity: input.shipsFromCity === undefined ? undefined : input.shipsFromCity,
          },
        });
      }

      return tx.vendorProfile.findUniqueOrThrow({
        where: { id: req.vendorId },
        include: { shop: true, stripeAccount: true },
      });
    });

    res.json({ data: { vendor: serializeVendor(vendor) } });
  } catch (err) {
    next(err);
  }
});

vendorRouter.post(
  '/category-suggestions',
  requireVendor({ requireApproved: true }),
  async (req: VendorRequest, res, next) => {
    try {
      const input = suggestCategorySchema.parse(req.body);
      const proposedName = input.proposedName.trim();

      const existingCat = await prisma.category.findFirst({
        where: {
          status: 'active',
          OR: [
            { name: { equals: proposedName, mode: 'insensitive' } },
            { slug: proposedName.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
          ],
        },
      });
      if (existingCat) {
        throw new AppError(
          409,
          'CATEGORY_EXISTS',
          `“${existingCat.name}” already exists — pick it from the category list`,
        );
      }

      const pendingDup = await prisma.categorySuggestion.findFirst({
        where: {
          vendorId: req.vendorId!,
          status: 'pending',
          proposedName: { equals: proposedName, mode: 'insensitive' },
        },
      });
      if (pendingDup) {
        throw new AppError(409, 'ALREADY_SUGGESTED', 'You already suggested this craft');
      }

      const row = await prisma.categorySuggestion.create({
        data: {
          vendorId: req.vendorId!,
          proposedName,
          note: input.note ?? '',
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: req.user!.sub,
          action: 'category_suggestion.create',
          entity: 'category_suggestion',
          entityId: row.id,
          meta: { proposedName, note: input.note ?? '' },
        },
      });

      res.status(201).json({
        data: {
          id: row.id,
          proposedName: row.proposedName,
          note: row.note,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

vendorRouter.get(
  '/category-suggestions',
  requireVendor({ requireApproved: true }),
  async (req: VendorRequest, res, next) => {
    try {
      const rows = await prisma.categorySuggestion.findMany({
        where: { vendorId: req.vendorId! },
        include: { category: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      res.json({
        data: rows.map((r) => ({
          id: r.id,
          proposedName: r.proposedName,
          note: r.note,
          status: r.status,
          adminNote: r.adminNote,
          category: r.category,
          createdAt: r.createdAt.toISOString(),
          reviewedAt: r.reviewedAt?.toISOString() ?? null,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);