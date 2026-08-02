import { chatCompletion, useChatMock } from './embeddings.js';
import type { RetrievedProduct } from './retrieve.js';

const BLOCKED =
  /\b(dropship|replica|counterfeit|fake\s+rolex|wholesale\s+china|temu|alibaba\s+resell)\b/i;

export function moderationFlags(text: string): string[] {
  const reasons: string[] = [];
  if (BLOCKED.test(text)) reasons.push('Possible mass-market / dropship language');
  if (/\b(organic|hallmarked|certified|fda\s+approved)\b/i.test(text) && !/\b(note|claim)\b/i.test(text)) {
    // soft warn only — listing copilot strips invented certs in draft
  }
  return reasons;
}

export async function composeConciergeReply(
  userMessage: string,
  products: RetrievedProduct[],
): Promise<string> {
  if (products.length === 0) {
    return "I couldn't find matching handmade pieces in the CraftHub catalog for that. Try a different material, gift idea, or budget.";
  }

  if (useChatMock()) {
    const lines = products.slice(0, 4).map((p) => `• ${p.title} from ${p.shopName}`);
    return [
      `Here are ${products.length} catalog matches grounded in CraftHub inventory (prices come from the database, not this message):`,
      ...lines,
      products.length > 4 ? `…and ${products.length - 4} more below.` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  const catalogJson = JSON.stringify(
    products.map((p) => ({
      id: p.id,
      title: p.title,
      shop: p.shopName,
      shopSlug: p.shopSlug,
      blurb: p.description,
    })),
  );

  const system = `You are CraftHub's shopping guide for a handmade artisan marketplace (pottery, jewelry, wood, textiles, food crafts).
Only discuss products in the provided JSON catalog. Never invent shops, products, brands, or categories that are not in that JSON.
If the buyer's request is unrelated to handmade goods in the catalog (e.g. car parts, electronics, oxygen sensors), say clearly that CraftHub does not carry that and invite a craft/gift rephrase. Do not pretend a catalog item is something it is not.
Do not quote prices — the UI shows DB prices. Be concise (2–5 sentences).`;

  const user = `Buyer said: ${userMessage}\n\nRetrieved catalog JSON:\n${catalogJson}`;
  const reply = await chatCompletion(system, user);
  return (
    reply ||
    `I found ${products.length} handmade pieces that may fit. Browse the cards below — prices are loaded from CraftHub.`
  );
}

export type ListingDraft = {
  title: string;
  description: string;
  tags: string[];
  categorySuggestion: string | null;
  materialCare: string;
  moderationWarnings: string[];
};

function titleFromNotes(notes: string, titleHint?: string): string {
  if (titleHint?.trim()) return titleHint.trim().slice(0, 80);
  const firstLine = notes.split(/[\n.!?]/)[0]?.trim() || 'Handmade piece';
  return (
    firstLine
      .replace(/^(i make|making|this is|notes?:)\s*/i, '')
      .slice(0, 80)
      .replace(/\s+/g, ' ')
      .replace(/^./, (c) => c.toUpperCase()) || 'Handmade craft'
  );
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    // Groq sometimes wraps JSON in ``` fences or adds prose
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim()) as Record<string, unknown>;
      } catch {
        /* continue */
      }
    }
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function generateListingDraft(input: {
  notes: string;
  categoryHint?: string;
  titleHint?: string;
  categoryNames: string[];
}): Promise<ListingDraft> {
  const warnings = moderationFlags(input.notes);
  const cleanedNotes = input.notes.replace(BLOCKED, '').trim();

  const hint = input.categoryHint?.toLowerCase() ?? '';
  const fallbackCategory =
    input.categoryNames.find((n) => n.toLowerCase().includes(hint) || hint.includes(n.toLowerCase())) ??
    input.categoryNames.find((n) => cleanedNotes.toLowerCase().includes(n.toLowerCase())) ??
    input.categoryNames[0] ??
    null;

  if (useChatMock()) {
    const tags = Array.from(
      new Set(
        cleanedNotes
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((t) => t.length > 3)
          .slice(0, 6),
      ),
    );

    return {
      title: titleFromNotes(cleanedNotes, input.titleHint),
      description: [
        cleanedNotes.slice(0, 600),
        '',
        'Made by hand for CraftHub. Edit this draft before publishing.',
      ].join('\n'),
      tags,
      categorySuggestion: fallbackCategory,
      materialCare: 'Wipe gently with a soft cloth. Avoid harsh cleaners unless noted by the maker.',
      moderationWarnings: warnings,
    };
  }

  const system = `You help artisans draft product listings for CraftHub (handmade marketplace).
Return ONLY a JSON object with keys:
- title: short product name (max 60 chars), derived from the notes — not "Handmade piece"
- description: 2–4 warm sentences for the listing (expand notes; no invented certifications)
- tags: string array of 3–6 short craft tags
- categorySuggestion: one of [${input.categoryNames.join(', ') || 'null'}] or null
- materialCare: one short care sentence
No markdown. No code fences.`;

  const user = `Notes:\n${cleanedNotes}\nCategory hint: ${input.categoryHint ?? ''}\nTitle hint: ${input.titleHint ?? ''}`;
  const raw = await chatCompletion(system, user, { json: true });
  const parsed = parseJsonObject(raw);

  if (!parsed) {
    return {
      title: titleFromNotes(cleanedNotes, input.titleHint),
      description: [
        cleanedNotes.slice(0, 600),
        '',
        'Made by hand for CraftHub. Edit this draft before publishing.',
      ].join('\n'),
      tags: [],
      categorySuggestion: fallbackCategory,
      materialCare: 'Wipe gently with a soft cloth. Avoid harsh cleaners unless noted by the maker.',
      moderationWarnings: warnings,
    };
  }

  const title = String(parsed.title ?? '').trim();
  return {
    title: (title || titleFromNotes(cleanedNotes, input.titleHint)).slice(0, 120),
    description: String(parsed.description ?? cleanedNotes).slice(0, 4000),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 8) : [],
    categorySuggestion:
      typeof parsed.categorySuggestion === 'string' && parsed.categorySuggestion
        ? parsed.categorySuggestion
        : fallbackCategory,
    materialCare: String(parsed.materialCare ?? '').slice(0, 500),
    moderationWarnings: warnings,
  };
}
