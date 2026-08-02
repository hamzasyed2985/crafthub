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

function asNumberArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  return value as number[];
}

/** Ensure catalog has embeddings (sync) then rank by cosine similarity. */
export async function retrieveProductsByQuery(
  query: string,
  limit: number,
): Promise<RetrievedProduct[]> {
  const embeddingCount = await prisma.productEmbedding.count();
  if (embeddingCount === 0) {
    const actives = await prisma.product.findMany({
      where: { status: 'active' },
      select: { id: true },
      take: 80,
    });
    for (const p of actives) {
      await upsertProductEmbedding(p.id);
    }
  }

  const { vector: queryVec } = await embedText(query);
  const rows = await prisma.productEmbedding.findMany({
    include: {
      product: {
        include: {
          shop: { include: { vendor: true } },
          variants: { orderBy: { priceCents: 'asc' }, take: 1 },
          media: { orderBy: { sortOrder: 'asc' }, take: 1 },
        },
      },
    },
  });

  const scored: RetrievedProduct[] = [];
  for (const row of rows) {
    const product = row.product;
    if (product.status !== 'active' || product.shop.vendor.status !== 'approved') continue;
    const vec = asNumberArray(row.vector);
    if (!vec) continue;
    const score = cosineSimilarity(queryVec, vec);
    const variant = product.variants[0];
    scored.push({
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description.slice(0, 280),
      score,
      shopSlug: product.shop.vendor.slug,
      shopName: product.shop.vendor.displayName,
      priceCents: variant?.priceCents ?? null,
      currency: variant?.currency ?? 'USD',
      imageUrl: product.media[0]?.url ?? null,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);
  // Drop weak matches so off-catalog queries (e.g. "oxygen sensor") don't dump random crafts.
  const floor = 0.12;
  if (!top.length || (top[0]?.score ?? 0) < floor) {
    return [];
  }
  return top.filter((p) => p.score >= floor * 0.85);
}
