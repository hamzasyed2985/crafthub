# 15 — AI Features

AI should make CraftHub **more useful as a craft marketplace**, not a ChatGPT widget glued in the corner. Prefer features grounded in *your* catalog, shops, and policies.

---

## Recommendation (what to build)

| Priority | Feature | Build it? | Why |
|----------|---------|-----------|-----|
| **P0** | **Craft Concierge** (grounded shopping assistant) | Yes | Feels like a chatbot UX, but answers from real products/shops — strong portfolio story |
| **P0** | **Vendor Listing Copilot** | Yes | Unique to multi-vendor; saves artisans time; shows dual-sided AI |
| **P1** | **Smart discovery** (NL → filters + ranked results) | Yes if time | Better than keyword search; easy to demo |
| **P2** | **Listing moderation assist** (admin) | Optional | Ties AI to admin panel; trust & safety angle |
| **Skip (v1)** | Generic open-domain chatbot | No | Looks like every other student project; hallucinates; weak commerce value |
| **Skip (v1)** | Auto image generation of products | No | Rights/quality issues; artisans want real photos |

### Chatbot vs something else?

Use a **chat-style UI**, but the product is **retrieval + tools over CraftHub data**, not unrestricted chat.

**Bad:** “Ask anything” bot that invents prices or shops that don’t exist.  
**Good:** Concierge that can only recommend in-catalog items, cite shop names, and deep-link to PDPs.

---

## P0 — Craft Concierge (buyer)

### What it does

Buyer types natural language, e.g.:

- “Handmade ceramic mug under $35 that ships from nearby”  
- “Gift for a gardener, budget $50”  
- “Show woodworkers who make cutting boards”

Bot returns:

1. Short answer  
2. 3–8 product cards (real IDs from DB)  
3. Optional shop suggestions  
4. Links: “View product” / “Visit shop” / “Add to cart”

### How it works (architecture)

```
User message
  → API /ai/concierge
  → Retrieve: embed query → similar products (pgvector or host embeddings)
  → Optional tools: searchProducts, getShop, getProduct
  → LLM composes answer ONLY from retrieved JSON
  → Response: markdown + structured productIds[]
  → Web renders ProductCards from IDs (prices from DB, never from LLM)
```

### Hard rules

- Prices, stock, and availability always from **database**, not model text  
- If retrieval is empty → say so; don’t invent makers  
- Log prompts/responses for debugging (redact PII)  
- Rate-limit per IP/user  
- System prompt: “You are CraftHub’s shopping guide. Only discuss retrieved catalog items.”

### UI

- Floating panel or `/explore?assistant=1` side sheet  
- Match design system (clay accent, linen panel) — not a purple Orb  
- Show “Based on N items in catalog” for trust  

### Stack options

| Piece | Practical choice |
|-------|------------------|
| LLM | **Groq** (free tier, OpenAI-compatible) or OpenAI / Anthropic |
| Embeddings | Mock bag-of-words by default; optional OpenAI `text-embedding-3-small` (Groq has no embeddings) |
| Store | Postgres + **pgvector** (keeps one DB) |
| Orchestration | Express module `ai/` + optional BullMQ for reindex |

---

## P0 — Vendor Listing Copilot

### What it does

On `/vendor/products/new`:

1. Vendor uploads photos and/or pastes rough notes  
2. Clicks **Generate listing**  
3. AI proposes: title, description, tags, category suggestion, material/care blurb  
4. Vendor edits everything before save (AI never auto-publishes)

### Why it’s better than a random chatbot

It shows you understand **seller workflows** on a multi-vendor platform — rare in student e-commerce demos.

### Rules

- Output is a **draft** in the form fields  
- Run a cheap moderation check (blocked words / “dropship” spam patterns)  
- Don’t invent certifications (“organic,” “hallmarked”) unless vendor typed them  

---

## P1 — Smart discovery (NL search)

Even without a chat bubble: a single search bar that parses intent into filters:

`mug clay under 40` → category hint + material + `price_cents <= 4000`

Can share the same retrieval layer as the Concierge.

---

## P2 — Admin moderation assist

In [Admin panel](./08-admin-panel.md):

- “Flag listings that look mass-produced / banned”  
- Suggest risk score + short reason  
- **Human always decides** approve/unpublish  

Good talking point: AI + admin RBAC + audit log.

---

## Data model additions

| Table / field | Purpose |
|---------------|---------|
| `product_embeddings` | `product_id`, `embedding vector`, `updated_at` |
| `ai_generations` | vendor drafts: prompt meta, output JSON, user_id |
| `ai_concierge_sessions` | optional chat history per user/session |

Reindex embeddings on product create/update (BullMQ job). Embeddings are stored as JSON float arrays with cosine similarity in the API (works on stock Postgres). Swap to **pgvector** later for large catalogs without changing the product API.

Mock mode (`E2E_AI_MOCK=1`, or no Groq/OpenAI chat key) uses deterministic bag-of-words embeddings + templated replies so local/e2e needs no paid API key.

**Groq (recommended free chat):** set `GROQ_API_KEY` from [console.groq.com/keys](https://console.groq.com/keys), set `E2E_AI_MOCK=0`, restart API. Retrieval still uses mock embeddings unless `OPENAI_API_KEY` is also set.

---

## API sketch

| Method | Path | Notes |
|--------|------|-------|
| POST | `/ai/concierge` | `{ messages[] }` → `{ reply, productIds[], shopSlugs[] }` |
| POST | `/ai/listings/generate` | vendor auth; `{ notes, categoryHint? }` → draft fields |
| POST | `/admin/ai/moderate-preview` | admin; `{ productId }` → `{ risk, reasons[] }` |

---

## Cost & safety (portfolio honesty)

- Cap tokens / requests per day in env  
- Use small models for classification; larger for concierge if needed  
- Never send Stripe secrets or full customer addresses to the LLM  
- Document: “AI can be wrong; UI always re-fetches catalog entities by ID”  

---

## What to say in interviews

> “I didn’t bolt on a generic chatbot. CraftHub’s AI is retrieval-augmented over the marketplace catalog, with a vendor listing copilot on the supply side. The LLM never owns price or stock — Postgres does.”

---

## Roadmap placement

Add after Phase 6 polish, or parallel once catalog search works:

- Embeddings backfill job  
- Concierge endpoint + UI  
- Vendor generate-listing button  
- (Optional) admin moderate-preview  

Do **not** delay Stripe Connect for AI.
