import { createHash } from 'node:crypto';
import { env } from '../../env.js';

/** Mock bag-of-words embedding size (Groq has no embeddings API). */
export const MOCK_EMBED_DIM = 384;

function forceMock(): boolean {
  return env.E2E_AI_MOCK === '1' || env.E2E_AI_MOCK === 'true';
}

/** Chat replies: Groq (preferred) or OpenAI when keys are set. */
export function useChatMock(): boolean {
  return forceMock() || (!env.GROQ_API_KEY && !env.OPENAI_API_KEY);
}

/** Embeddings: mock unless OpenAI key is set (Groq does not offer embeddings). */
export function useEmbeddingMock(): boolean {
  return forceMock() || !env.OPENAI_API_KEY;
}

/** @deprecated Prefer useChatMock / useEmbeddingMock — kept for API meta. */
export function useAiMock(): boolean {
  return useChatMock();
}

export function embeddingModelName(): string {
  return useEmbeddingMock() ? 'mock-bow-v1' : env.OPENAI_EMBEDDING_MODEL;
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

/** Deterministic L2-normalized embedding for local/e2e / Groq setups. */
export function mockEmbed(text: string, dim = MOCK_EMBED_DIM): number[] {
  const vec = new Array<number>(dim).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    vec[0] = 1;
    return vec;
  }
  for (const token of tokens) {
    const i = hashIndex(token, dim);
    const sign = hashIndex(`s:${token}`, 2) === 0 ? 1 : -1;
    vec[i] = (vec[i] ?? 0) + sign;
  }
  for (let i = 0; i < tokens.length - 1; i++) {
    const bi = `${tokens[i]}_${tokens[i + 1]}`;
    const j = hashIndex(bi, dim);
    vec[j] = (vec[j] ?? 0) + 0.5;
  }
  return l2Normalize(vec);
}

export function l2Normalize(vec: number[]): number[] {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum) || 1;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i]! * b[i]!;
  return dot;
}

export function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 32);
}

export async function embedText(text: string): Promise<{ vector: number[]; model: string }> {
  if (useEmbeddingMock()) {
    return { vector: mockEmbed(text), model: 'mock-bow-v1' };
  }

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: text.slice(0, 8000),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI embeddings failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  const vector = json.data[0]?.embedding;
  if (!vector?.length) throw new Error('OpenAI embeddings returned empty vector');
  return { vector: l2Normalize(vector), model: env.OPENAI_EMBEDDING_MODEL };
}

export async function chatCompletion(
  system: string,
  user: string,
  opts?: { json?: boolean },
): Promise<string> {
  if (useChatMock()) {
    return '';
  }

  const body: Record<string, unknown> = {
    temperature: 0.3,
    max_tokens: env.AI_MAX_TOKENS,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };
  if (opts?.json) {
    body.response_format = { type: 'json_object' };
  }

  if (env.GROQ_API_KEY) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        model: env.GROQ_CHAT_MODEL,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Groq chat failed: ${res.status} ${errBody.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices: Array<{ message?: { content?: string } }>;
    };
    return json.choices[0]?.message?.content?.trim() ?? '';
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...body,
      model: env.OPENAI_CHAT_MODEL,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI chat failed: ${res.status} ${errBody.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices: Array<{ message?: { content?: string } }>;
  };
  return json.choices[0]?.message?.content?.trim() ?? '';
}
