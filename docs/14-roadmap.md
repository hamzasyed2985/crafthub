# 14 — Roadmap

Build in phases. Each phase has a **verify** gate before moving on.

| Phase | Name | Deliverable | Verify |
|-------|------|-------------|--------|
| 0 | Foundation | Monorepo, Compose, CI green, design tokens, auth skeleton | `compose up` + CI passes |
| 1 | Vendors & catalog | Apply flow, admin approve, shops, products, media | Public shop + PDP render |
| 2 | Cart | Multi-vendor cart, stock checks | Add from 2 shops works |
| 3 | Checkout & Connect | Stripe Connect onboarding + test payment + webhooks | Paid order after webhook |
| 4 | Vendor ops | Orders, ship, earnings UI | Vendor fulfills test order |
| 5 | Admin finance | Metrics, refund, commission setting | Refund syncs Stripe |
| 6 | Trust & polish | Reviews, search, email templates, dark mode QA | Demo script runs clean (`trust-polish` e2e) |
| 6.5 | AI | Embeddings + Concierge + Listing Copilot | `ai.e2e` — real product IDs + draft fields |
| 7 | Scale & ship | Caching, Sentry, staging+prod, load notes | Public URL + README case study |

**Phase 7 status (portfolio Path A):** public Vercel + Railway demo live; Sentry optional via `SENTRY_DSN`; Redis used for queues (not HTTP cache); load notes in [13-deployment](./13-deployment.md); full staging/prod split and Redis response caching deferred.

**What’s left for this portfolio build?** See **[16 — Production-grade engineering](./16-production-readiness.md)** — optional polish to match how prod teams build; **not** a launch checklist (no live Stripe, no real users).

## Phase notes

### 0 — Foundation

- pnpm workspace  
- Prisma initial schema (users/roles)  
- GitHub Actions lint/typecheck  
- `packages/ui` Button/Input + theme  

### 1 — Vendors & catalog

- Vendor apply + admin approve  
- Shop pages SEO  
- Product CRUD + variants + R2 upload  

### 3 — Payments (critical)

Do not skip webhook idempotency or inventory reservations. This phase is what makes CraftHub a marketplace, not a brochure.

### 7 — Portfolio wrap

- Architecture diagram  
- Tradeoffs: modular monolith vs microservices  
- Loom: buyer + vendor + admin  
- Seed credentials for reviewers  
- CI badge  

## Phase 6.5 — AI (after catalog is solid)

See [15 — AI features](./15-ai-features.md).

| Deliverable | Verify |
|-------------|--------|
| Product embeddings + reindex job | Search returns real product IDs |
| Craft Concierge UI + API | Demo query → product cards with DB prices |
| Vendor Listing Copilot | Draft title/description into form (not auto-publish) |

Do **not** delay Stripe Connect for AI.

## Nice-to-haves (only after MVP)

- Buyer–vendor messaging  
- Meilisearch  
- Admin AI moderation queue  
- Subscription boxes for artisans  
- Dispute center  
- Extract notification microservice  

## Time boxing (solo student)

Roughly **10–14 weeks** part-time for a strong portfolio demo. Cut nice-to-haves before cutting Connect payouts or admin approval.
