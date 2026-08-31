# 03 — Architecture

## Style: modular monolith

One Express API process, organized by **bounded contexts**. Same PostgreSQL database; shared transactions where money and inventory meet. Workers run as a **separate process**, same monorepo.

```
Browser
  └─ Next.js (web) — Vercel
        ├─ Client components → REST + Bearer + cookies
        └─ SSR pages (home, shop, PDP) → REST
              └─ Express API — Railway
                    ├─ Auth (JWT + refresh rotation, password reset)
                    ├─ Catalog (products, shops, search, reviews)
                    ├─ Cart
                    ├─ Checkout / Orders
                    ├─ Payments (Stripe Connect + webhooks)
                    ├─ Inventory (reservations)
                    ├─ Vendors / Admin / Finance
                    ├─ AI (concierge, listing copilot, embeddings)
                    └─ Notifications (enqueue only)
                          └─ Redis / BullMQ → Worker
                                ├─ Reservation expiry (sweep + delayed jobs)
                                ├─ Email outbox (mock delivery today)
                                └─ Embedding reindex jobs
```

## Processes

| Process | Responsibility |
|---------|----------------|
| `web` | UI, SEO pages, auth pages, Explore filters, Concierge drawer |
| `api` | Business logic, REST, Stripe webhook HTTP endpoint |
| `worker` | Async jobs (reservations, email outbox, embeddings) |
| `postgres` | Source of truth (Prisma) |
| `redis` | **BullMQ queues only** — not HTTP response cache |

## Happy path — purchase

1. Buyer adds items (possibly from multiple vendors) to cart  
2. Checkout creates **one Stripe Checkout Session** per cart  
3. Platform records `Order` + per-vendor `VendorOrder` slices  
4. Stripe webhook confirms payment → order `paid`  
5. Inventory reservations convert to stock decrements  
6. Vendor dashboards show new orders; Connect transfers recorded  
7. Vendor fulfills → buyer tracks shipment; optional review after ship  

## Multi-vendor checkout

**Option A — Single checkout, split internally (implemented)**  
One Stripe payment; platform commission; transfers per vendor slice. Better UX and what CraftHub ships.

## Module boundaries

| Module | Owns | Must not own |
|--------|------|--------------|
| Catalog | Products, categories, media, search | Payment capture |
| Vendors | Shop profile, onboarding, Stripe account link | Platform commission config write (admin) |
| Cart | Cart lines, guest cart | Order finalization |
| Orders | Order state machine, line snapshots | Raw Stripe secrets in client |
| Payments | Stripe SDK, webhooks, fee math | Email templates |
| Inventory | Stock, reservations | UI |
| Admin | Moderation, settings, refunds, finance | Bypass webhook verification |
| AI | Concierge, listing drafts, embeddings jobs | Auto-publish listings |

## Scaling path (later)

When needed, extract:

1. `worker` already separate  
2. Webhook ingress service (verify + enqueue only)  
3. Read replicas / Meilisearch for catalog  
4. Redis or CDN for **HTTP** caching (not implemented today)  

Do **not** split Orders and Inventory across networks until you have a real reason — they need shared transactions.

## Cross-cutting (implemented)

| Concern | Implementation |
|---------|------------------|
| Idempotency | Checkout `Idempotency-Key`; Stripe webhook event dedup |
| Outbox | `email_outbox` + worker send |
| Health | `GET /health` (liveness), `GET /ready` (Postgres `SELECT 1`) |
| Request ID | `X-Request-Id` middleware; echoed on errors |
| Observability | pino logs; optional Sentry (`SENTRY_DSN`) on API |
| Rate limits | In-memory on auth + checkout + AI (per API instance) |

## Deploy diagram (current)

```
Buyer → crafthub-api-five.vercel.app (web)
     → api-production-….up.railway.app (api)
     → Postgres + Redis (Railway)
     → worker (Railway, no public URL)
     ↔ Stripe (Connect + webhooks)
```

See [13 — Deployment](./13-deployment.md) and [16 — Production readiness](./16-production-readiness.md).
