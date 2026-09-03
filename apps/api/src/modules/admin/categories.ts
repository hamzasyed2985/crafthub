import { Router } from 'express';
import { prisma } from '@crafthub/db';
import {
  adminCategoryCreateSchema,
  adminCategoryPatchSchema,
  adminCategorySuggestionReviewSchema,
} from '@crafthub/shared';
import { AppError } from '../../lib/errors.js';
import { parsePagination, routeParam, slugify } from '../../lib/helpers.js';
import { requireAuth, requireRole, type AuthedRequest } from '../../middleware/auth.js';

export const adminCategoriesRouter = Router();

adminCategoriesRouter.use(requireAuth, requireRole('admin'));

function serializeCategory(c: {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  status: string;
  featured: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: { products: number };
}) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parentId,
    status: c.status,
    featured: c.featured,
    sortOrder: c.sortOrder,
    productCount: c._count?.products ?? undefined,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

adminCategoriesRouter.get('/categories', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const where =
      status === 'active' || status === 'archived'
        ? { status: status as 'active' | 'archived' }
        : {};

    const [total, rows] = await Promise.all([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        include: { _count: { select: { products: true } } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
    ]);

    res.json({
      data: rows.map(serializeCategory),
      meta: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
});

adminCategoriesRouter.post('/categories', async (req: AuthedRequest, res, next) => {
  try {
    const input = adminCategoryCreateSchema.parse(req.body);
    const slug = input.slug ?? slugify(input.name);
    if (!slug) throw new AppError(400, 'INVALID_SLUG', 'Could not derive a category slug');

    const clash = await prisma.category.findUnique({ where: { slug } });
    if (clash) throw new AppError(409, 'SLUG_TAKEN', 'A category with this slug already exists');

    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.category.create({
        data: {
          name: input.name,
          slug,
          featured: input.featured ?? false,
          sortOrder: input.sortOrder ?? 0,
          status: 'active',
        },
        include: { _count: { select: { products: true } } },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.sub,
          action: 'category.create',
          entity: 'category',
          entityId: row.id,
          meta: { name: row.name, slug: row.slug },
        },
      });
      return row;
    });

    res.status(201).json({ data: serializeCategory(created) });
  } catch (err) {
    next(err);
  }
});

adminCategoriesRouter.patch('/categories/:id', async (req: AuthedRequest, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const input = adminCategoryPatchSchema.parse(req.body);
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Category not found');

    if (input.slug && input.slug !== existing.slug) {
      const clash = await prisma.category.findUnique({ where: { slug: input.slug } });
      if (clash) throw new AppError(409, 'SLUG_TAKEN', 'A category with this slug already exists');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.category.update({
        where: { id },
        data: {
          name: input.name,
          slug: input.slug,
          status: input.status,
          featured: input.featured,
          sortOrder: input.sortOrder,
        },
        include: { _count: { select: { products: true } } },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.sub,
          action: 'category.update',
          entity: 'category',
          entityId: row.id,
          meta: {
            from: {
              name: existing.name,
              slug: existing.slug,
              status: existing.status,
              featured: existing.featured,
            },
            to: {
              name: row.name,
              slug: row.slug,
              status: row.status,
              featured: row.featured,
            },
          },
        },
      });
      return row;
    });

    res.json({ data: serializeCategory(updated) });
  } catch (err) {
    next(err);
  }
});

adminCategoriesRouter.get('/category-suggestions', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : 'pending';
    const where =
      status === 'pending' || status === 'approved' || status === 'rejected'
        ? { status: status as 'pending' | 'approved' | 'rejected' }
        : {};

    const [total, rows] = await Promise.all([
      prisma.categorySuggestion.count({ where }),
      prisma.categorySuggestion.findMany({
        where,
        include: {
          vendor: { select: { id: true, displayName: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
          reviewedBy: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      data: rows.map((r) => ({
        id: r.id,
        proposedName: r.proposedName,
        note: r.note,
        status: r.status,
        adminNote: r.adminNote,
        vendor: r.vendor,
        category: r.category,
        reviewedBy: r.reviewedBy,
        reviewedAt: r.reviewedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
});

adminCategoriesRouter.post(
  '/category-suggestions/:id/review',
  async (req: AuthedRequest, res, next) => {
    try {
      const id = routeParam(req.params.id);
      const input = adminCategorySuggestionReviewSchema.parse(req.body);
      const existing = await prisma.categorySuggestion.findUnique({
        where: { id },
        include: { vendor: { select: { id: true, displayName: true } } },
      });
      if (!existing) throw new AppError(404, 'NOT_FOUND', 'Suggestion not found');
      if (existing.status !== 'pending') {
        throw new AppError(400, 'INVALID_STATUS', 'Suggestion already reviewed');
      }

      const result = await prisma.$transaction(async (tx) => {
        let categoryId: string | null = null;
        let category: { id: string; name: string; slug: string } | null = null;

        if (input.decision === 'approved') {
          const name = input.name?.trim() || existing.proposedName;
          const slug = input.slug ?? slugify(name);
          if (!slug) throw new AppError(400, 'INVALID_SLUG', 'Could not derive a category slug');

          const clash = await tx.category.findUnique({ where: { slug } });
          if (clash) {
            throw new AppError(409, 'SLUG_TAKEN', 'A category with this slug already exists');
          }

          category = await tx.category.create({
            data: {
              name,
              slug,
              featured: input.featured ?? false,
              status: 'active',
              sortOrder: 100,
            },
            select: { id: true, name: true, slug: true },
          });
          categoryId = category.id;
        }

        const suggestion = await tx.categorySuggestion.update({
          where: { id },
          data: {
            status: input.decision,
            adminNote: input.adminNote ?? null,
            categoryId,
            reviewedById: req.user!.sub,
            reviewedAt: new Date(),
          },
          include: {
            vendor: { select: { id: true, displayName: true, slug: true } },
            category: { select: { id: true, name: true, slug: true } },
            reviewedBy: { select: { id: true, email: true, name: true } },
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: req.user!.sub,
            action: `category_suggestion.${input.decision}`,
            entity: 'category_suggestion',
            entityId: suggestion.id,
            meta: {
              proposedName: existing.proposedName,
              vendorId: existing.vendorId,
              categoryId,
              adminNote: input.adminNote ?? null,
            },
          },
        });

        return suggestion;
      });

      res.json({
        data: {
          id: result.id,
          proposedName: result.proposedName,
          note: result.note,
          status: result.status,
          adminNote: result.adminNote,
          vendor: result.vendor,
          category: result.category,
          reviewedBy: result.reviewedBy,
          reviewedAt: result.reviewedAt?.toISOString() ?? null,
          createdAt: result.createdAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);
