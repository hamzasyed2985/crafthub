import { prisma } from '@crafthub/db';
import { contentHash, embedText, embeddingModelName } from './embeddings.js';

export function buildProductEmbedText(product: {
  title: string;
  description: string;
  category?: { name: string } | null;
  shop?: {
    shipsFromCity?: string | null;
    vendor?: {
      displayName: string;
      city: string | null;
      craftTags: string[];
    } | null;
  } | null;
}): string {
  const parts = [
    product.title,
    product.description,
    product.category?.name ?? '',
    product.shop?.vendor?.displayName ?? '',
    product.shop?.vendor?.city ?? '',
    product.shop?.shipsFromCity ?? '',
    (product.shop?.vendor?.craftTags ?? []).join(' '),
  ];
  return parts.filter(Boolean).join('\n');
}

export async function upsertProductEmbedding(productId: string): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      shop: { include: { vendor: true } },
    },
  });
  if (!product || product.status !== 'active') {
    if (product) {
      await prisma.productEmbedding.deleteMany({ where: { productId } });
    }
    return false;
  }

  const text = buildProductEmbedText(product);
  const hash = contentHash(text);
  const existing = await prisma.productEmbedding.findUnique({ where: { productId } });
  if (existing && existing.contentHash === hash && existing.model === embeddingModelName()) {
    return true;
  }

  const { vector, model } = await embedText(text);
  await prisma.productEmbedding.upsert({
    where: { productId },
    create: {
      productId,
      vector,
      model,
      contentHash: hash,
    },
    update: {
      vector,
      model,
      contentHash: hash,
    },
  });
  return true;
}

export async function reindexAllActiveProducts(): Promise<{ indexed: number; skipped: number }> {
  const products = await prisma.product.findMany({
    where: { status: 'active' },
    select: { id: true },
  });
  let indexed = 0;
  let skipped = 0;
  for (const p of products) {
    const ok = await upsertProductEmbedding(p.id);
    if (ok) indexed += 1;
    else skipped += 1;
  }
  return { indexed, skipped };
}
