import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { conciergeRequestSchema, listingGenerateSchema } from '@crafthub/shared';
import { env } from '../../env.js';
import { AppError } from '../../lib/errors.js';
import { enqueueProductEmbedding, enqueueEmbeddingReindexAll } from '../../lib/queue.js';
import { requireAuth, requireRole, type AuthedRequest } from '../../middleware/auth.js';
import { optionalAuth } from '../../middleware/optional-auth.js';
import { requireVendor, type VendorRequest } from '../../middleware/vendor.js';
import { composeConciergeReply, generateListingDraft } from './compose.js';
import { useAiMock } from './embeddings.js';
import { checkRateLimit } from './rate-limit.js';
import { reindexAllActiveProducts, upsertProductEmbedding } from './reindex.js';
import { retrieveProductsByQuery } from './retrieve.js';

export const aiRouter = Router();

aiRouter.post('/concierge', optionalAuth, async (req: AuthedRequest, res, next) => {
  try {
    const input = conciergeRequestSchema.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `concierge:${req.user?.sub ?? ip}`;
    const limit = checkRateLimit(key, env.AI_RATE_LIMIT_PER_MIN);
    if (!limit.ok) {
      throw new AppError(429, 'RATE_LIMITED', `Too many requests. Retry in ${limit.retryAfterSec}s`);
    }

    const lastUser = [...input.messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) throw new AppError(400, 'NO_MESSAGE', 'Include at least one user message');

    const products = await retrieveProductsByQuery(lastUser.content, input.limit);
    const reply = await composeConciergeReply(lastUser.content, products);
    const shopSlugs = [...new Set(products.map((p) => p.shopSlug))];

    await prisma.aiGeneration.create({
      data: {
        userId: req.user?.sub ?? null,
        kind: 'concierge',
        promptMeta: {
          message: lastUser.content.slice(0, 500),
          mock: useAiMock(),
          retrieved: products.length,
        },
        output: {
          reply: reply.slice(0, 4000),
          productIds: products.map((p) => p.id),
        },
      },
    });

    res.json({
      data: {
        reply,
        productIds: products.map((p) => p.id),
        shopSlugs,
        products: products.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          shopSlug: p.shopSlug,
          shopName: p.shopName,
          priceCents: p.priceCents,
          currency: p.currency,
          imageUrl: p.imageUrl,
          score: Number(p.score.toFixed(4)),
        })),
        meta: {
          retrieved: products.length,
          mock: useAiMock(),
          basedOnCatalog: true,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

aiRouter.post(
  '/listings/generate',
  requireAuth,
  requireVendor({ requireApproved: true }),
  async (req: VendorRequest, res, next) => {
    try {
      const input = listingGenerateSchema.parse(req.body);
      const key = `listing:${req.user!.sub}`;
      const limit = checkRateLimit(key, Math.max(5, Math.floor(env.AI_RATE_LIMIT_PER_MIN / 2)));
      if (!limit.ok) {
        throw new AppError(429, 'RATE_LIMITED', `Too many requests. Retry in ${limit.retryAfterSec}s`);
      }

      const categories = await prisma.category.findMany({
        where: { status: 'active' },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true },
      });

      const draft = await generateListingDraft({
        notes: input.notes,
        categoryHint: input.categoryHint,
        titleHint: input.titleHint,
        categoryNames: categories.map((c) => c.name),
      });

      const matched = draft.categorySuggestion
        ? categories.find((c) => c.name.toLowerCase() === draft.categorySuggestion!.toLowerCase())
        : undefined;

      await prisma.aiGeneration.create({
        data: {
          userId: req.user!.sub,
          kind: 'listing_draft',
          promptMeta: {
            notes: input.notes.slice(0, 500),
            mock: useAiMock(),
          },
          output: draft as object,
        },
      });

      res.json({
        data: {
          draft: {
            ...draft,
            categoryId: matched?.id ?? null,
          },
          meta: { mock: useAiMock() },
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

aiRouter.post(
  '/embeddings/reindex',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const sync = req.query.sync === '1' || req.body?.sync === true;
      if (sync) {
        const result = await reindexAllActiveProducts();
        res.json({ data: { mode: 'sync', ...result, mock: useAiMock() } });
        return;
      }
      await enqueueEmbeddingReindexAll();
      res.json({ data: { mode: 'queued', mock: useAiMock() } });
    } catch (err) {
      next(err);
    }
  },
);

aiRouter.post(
  '/embeddings/reindex/:productId',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const productId = req.params.productId as string;
      const sync = req.query.sync === '1';
      if (sync) {
        const ok = await upsertProductEmbedding(productId);
        res.json({ data: { productId, indexed: ok, mock: useAiMock() } });
        return;
      }
      await enqueueProductEmbedding(productId);
      res.json({ data: { productId, mode: 'queued', mock: useAiMock() } });
    } catch (err) {
      next(err);
    }
  },
);

aiRouter.get('/embeddings/status', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const [products, embeddings] = await Promise.all([
      prisma.product.count({ where: { status: 'active' } }),
      prisma.productEmbedding.count(),
    ]);
    res.json({
      data: {
        activeProducts: products,
        embeddings,
        mock: useAiMock(),
      },
    });
  } catch (err) {
    next(err);
  }
});
