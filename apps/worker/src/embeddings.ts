import { createHash } from 'node:crypto';
import { prisma } from '@crafthub/db';

const MOCK_DIM = 384;

function useAiMock() {
  return (
    process.env.E2E_AI_MOCK === '1' ||
    process.env.E2E_AI_MOCK === 'true' ||
    !process.env.OPENAI_API_KEY
  );
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s$]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function hashIndex(token: string, dim: number): number {
  const h = createHash('sha256').update(token).digest();
  return h.readUInt32BE(0) % dim;
}

function l2Normalize(vec: number[]): number[] {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum) || 1;
  return vec.map((v) => v / norm);
}

function mockEmbed(text: string): number[] {
  const vec = new Array<number>(MOCK_DIM).fill(0);
  const tokens = tokenize(text);
  if (!tokens.length) {
    vec[0] = 1;
    return vec;
  }
  for (const token of tokens) {
    const i = hashIndex(token, MOCK_DIM);
    const sign = hashIndex(`s:${token}`, 2) === 0 ? 1 : -1;
    vec[i] = (vec[i] ?? 0) + sign;
  }
  for (let i = 0; i < tokens.length - 1; i++) {
    const j = hashIndex(`${tokens[i]}_${tokens[i + 1]}`, MOCK_DIM);
    vec[j] = (vec[j] ?? 0) + 0.5;
  }
  return l2Normalize(vec);
}

async function embedText(text: string): Promise<{ vector: number[]; model: string }> {
  if (useAiMock()) return { vector: mockEmbed(text), model: 'mock-bow-v1' };

  const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: text.slice(0, 8000) }),
  });
  if (!res.ok) throw new Error(`embeddings ${res.status}`);
  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return { vector: l2Normalize(json.data[0]!.embedding), model };
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
    if (product) await prisma.productEmbedding.deleteMany({ where: { productId } });
    return false;
  }

  const text = [
    product.title,
    product.description,
    product.category?.name ?? '',
    product.shop.vendor.displayName,
    product.shop.vendor.city ?? '',
    product.shop.shipsFromCity ?? '',
    product.shop.vendor.craftTags.join(' '),
  ]
    .filter(Boolean)
    .join('\n');

  const hash = createHash('sha256').update(text).digest('hex').slice(0, 32);
  const modelName = useAiMock()
    ? 'mock-bow-v1'
    : process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  const existing = await prisma.productEmbedding.findUnique({ where: { productId } });
  if (existing && existing.contentHash === hash && existing.model === modelName) return true;

  const { vector, model } = await embedText(text);
  await prisma.productEmbedding.upsert({
    where: { productId },
    create: { productId, vector, model, contentHash: hash },
    update: { vector, model, contentHash: hash },
  });
  return true;
}

export async function reindexAllActiveProducts() {
  const products = await prisma.product.findMany({
    where: { status: 'active' },
    select: { id: true },
  });
  let indexed = 0;
  for (const p of products) {
    if (await upsertProductEmbedding(p.id)) indexed += 1;
  }
  return indexed;
}
