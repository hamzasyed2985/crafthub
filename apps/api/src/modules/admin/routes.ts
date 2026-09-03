import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { adminVendorPatchSchema } from '@crafthub/shared';
import { AppError } from '../../lib/errors.js';
import { enqueueEmail } from '../../lib/email.js';
import { parsePagination, routeParam } from '../../lib/helpers.js';
import { serializeVendor } from '../../lib/serializers.js';
import { requireAuth, requireRole, type AuthedRequest } from '../../middleware/auth.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/vendors', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const where: {
      status?: 'pending' | 'approved' | 'suspended';
      OR?: Array<Record<string, unknown>>;
    } = status ? { status: status as 'pending' | 'approved' | 'suspended' } : {};

    if (q) {
      where.OR = [
        { displayName: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { bio: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, vendors] = await Promise.all([
      prisma.vendorProfile.count({ where }),
      prisma.vendorProfile.findMany({
        where,
        include: { shop: true, stripeAccount: true, user: { select: { email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      data: vendors.map((v) => ({
        ...serializeVendor(v),
        user: { email: v.user.email, name: v.user.name },
      })),
      meta: { total, page, limit, q },
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/vendors/:id', async (req, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id },
      include: {
        shop: true,
        stripeAccount: true,
        user: { select: { email: true, name: true, id: true } },
      },
    });
    if (!vendor) throw new AppError(404, 'NOT_FOUND', 'Vendor not found');

    const productCount = vendor.shop
      ? await prisma.product.count({ where: { shopId: vendor.shop.id } })
      : 0;

    res.json({
      data: {
        vendor: {
          ...serializeVendor(vendor),
          user: vendor.user,
          productCount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/vendors/:id', async (req: AuthedRequest, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const input = adminVendorPatchSchema.parse(req.body);
    const existing = await prisma.vendorProfile.findUnique({
      where: { id },
      include: { shop: true, stripeAccount: true },
    });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Vendor not found');

    const vendor = await prisma.$transaction(async (tx) => {
      const updated = await tx.vendorProfile.update({
        where: { id: existing.id },
        data: { status: input.status },
        include: { shop: true, stripeAccount: true, user: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user!.sub,
          action: `vendor.${input.status}`,
          entity: 'vendor_profile',
          entityId: existing.id,
          meta: {
            reason: input.reason ?? null,
            from: existing.status,
            displayName: existing.displayName,
            slug: existing.slug,
          },
        },
      });

      return updated;
    });

    if (input.status === 'approved' && existing.status !== 'approved' && vendor.user?.email) {
      try {
        await enqueueEmail({
          toEmail: vendor.user.email,
          template: 'vendor.approved',
          payload: {
            name: vendor.user.name,
            shopName: vendor.displayName,
          },
        });
      } catch {
        // non-fatal
      }
    }

    const { user: _user, ...vendorForSerialize } = vendor;
    void _user;
    res.json({ data: { vendor: serializeVendor(vendorForSerialize) } });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/products/:id/unpublish', async (req: AuthedRequest, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: product.id },
        data: { status: 'archived' },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.sub,
          action: 'product.unpublish',
          entity: 'product',
          entityId: product.id,
          meta: { title: product.title, slug: product.slug },
        },
      });
      return p;
    });

    res.json({ data: { id: updated.id, status: updated.status } });
  } catch (err) {
    next(err);
  }
});
