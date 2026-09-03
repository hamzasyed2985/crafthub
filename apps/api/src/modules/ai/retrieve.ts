import { prisma } from '@crafthub/db';
import { cosineSimilarity, embedText } from './embeddings.js';
import { upsertProductEmbedding } from './reindex.js';

export type RetrievedProduct = {
  id: string;
  title: string;
  slug: string;
  description: string;
  score: number;
  shopSlug: string;
  shopName: string;
  priceCents: number | null;
  currency: string;
  imageUrl: string | null;
};

const SCORE_FLOOR = 0.12;
const CANDIDATE_MULTIPLIER = 4;

const activeCatalogWhere = {
  product: {
    status: 'active' as const,
    shop: { vendor: { status: 'approved' as const } },
  },
};

function asNumberArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  return value as number[];
}

async function ensureEmbeddingsSeeded(): Promise<void> {
  const embeddingCount = await prisma.productEmbedding.count({
    where: activeCatalogWhere,
  });
  if (embeddingCount > 0) return;

  const actives = await prisma.product.findMany({
    where: {
      status: 'active',
      shop: { vendor: { status: 'approved' } },
    },
    select: { id: true },
    take: 80,
  });
  for (const p of actives) {
    await upsertProductEmbedding(p.id);
  }
}

/** Ensure catalog has embeddings (sync) then rank by cosine similarity. */
export async function retrieveProductsByQuery(
  query: string,
  limit: number,
): Promise<RetrievedProduct[]> {
  await ensureEmbeddingsSeeded();

  const { vector: queryVec } = await embedText(query);

  const rows = await prisma.productEmbedding.findMany({
    where: activeCatalogWhere,
    select: { productId: true, vector: true },
  });

  const scored: Array<{ productId: string; score: number }> = [];
  for (const row of rows) {
    const vec = asNumberArray(row.vector);
    if (!vec) continue;
    scored.push({ productId: row.productId, score: cosineSimilarity(queryVec, vec) });
  }

  scored.sort((a, b) => b.score - a.score);
  const candidateCount = Math.max(limit * CANDIDATE_MULTIPLIER, limit);
  const topCandidates = scored.slice(0, candidateCount);

  if (!topCandidates.length || (topCandidates[0]?.score ?? 0) < SCORE_FLOOR) {
    return [];
  }

  const filtered = topCandidates
    .filter((row) => row.score >= SCORE_FLOOR * 0.85)
    .slice(0, limit);

  if (filtered.length === 0) return [];

  const scoreById = new Map(filtered.map((row) => [row.productId, row.score]));
  const products = await prisma.product.findMany({
    where: { id: { in: filtered.map((row) => row.productId) } },
    include: {
      shop: { include: { vendor: true } },
      variants: { orderBy: { priceCents: 'asc' }, take: 1 },
      media: { orderBy: { sortOrder: 'asc' }, take: 1 },
    },
  });

  const order = new Map(filtered.map((row, index) => [row.productId, index]));

  return products
    .slice()
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map((product) => {
      const variant = product.variants[0];
      return {
        id: product.id,
        title: product.title,
        slug: product.slug,
        description: product.description.slice(0, 280),
        score: scoreById.get(product.id) ?? 0,
        shopSlug: product.shop.vendor.slug,
        shopName: product.shop.vendor.displayName,
        priceCents: variant?.priceCents ?? null,
        currency: variant?.currency ?? 'USD',
        imageUrl: product.media[0]?.url ?? null,
      };
    });
}
