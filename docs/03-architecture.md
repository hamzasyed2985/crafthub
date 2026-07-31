# 03 — Architecture

## Style: modular monolith

One Express API process, organized by **bounded contexts**. Same database, shared transactions where money and inventory meet. Workers run as a separate process, same codebase.

```
Browser
  └─ Next.js (web)
        ├─ SSR / RSC pages
        └─ BFF route handlers (optional cookie bridge)
              └─ Express API
                    ├─ Auth
                    ├─ Catalog (products, shops)
                    ├─ Cart
                    ├─ Checkout / Orders
                    ├─ Payments (Stripe Connect)
                    ├─ Inventory
                    ├─ Vendors
                    ├─ Admin
                    └─ Notifications (enqueue only)
                          └─ Redis / BullMQ → Worker
                                ├─ Email
                                ├─ Webhook retries
                                └─ Payout jobs
```

## Processes

| Process | Responsibility |
|---------|----------------|
| `web` | UI, SEO pages, auth pages, uploads via signed URLs |
| `api` | Business logic, REST, webhook HTTP endpoints |
| `worker` | Async jobs (email, Stripe event reprocessing) |
| `postgres` | Source of truth |
| `redis` | Cache, queues, rate limits |

## Happy path — purchase

1. Buyer adds items (possibly from multiple vendors) to cart  
2. Checkout creates **one payment** (or one PaymentIntent with transfer group) via Stripe Connect  
3. Platform records `Order` + `OrderItems` per vendor (`VendorOrder` / sub-orders)  
4. Stripe webhook confirms payment → order `paid`  
5. Inventory reservations convert to decrements  
6. Vendor dashboards show new orders  
7. After fulfillment / payout schedule, vendor balance is transferred (Connect destination charges or separate transfers)

## Multi-vendor cart strategy (recommended MVP)

**Option A — Single checkout, split internally (recommended)**  
One Stripe payment; application fee = commission; destination charge or transfer to each vendor. More complex but better UX.

**Option B — Per-vendor checkout**  
Simpler payments, worse UX (buyer pays N times). Acceptable for early spike only.

Document which you choose in the README. Prefer **Option A** for portfolio strength.

## Module boundaries

| Module | Owns | Must not own |
|--------|------|--------------|
| Catalog | Products, categories, media | Payment capture |
| Vendors | Shop profile, onboarding, Stripe account link | Platform commission config write (admin) |
| Cart | Cart lines, guest cart | Order finalization |
| Orders | Order state machine, line snapshots | Raw Stripe secrets |
| Payments | Stripe SDK, webhooks, fee math | Email templates |
| Inventory | Stock, reservations | UI |
| Admin | Moderation, settings, force actions | Bypass webhook verification |

## Scaling path (later)

When needed, extract:

1. `worker` already separate  
2. `payments-webhook` service (verify + enqueue only)  
3. Read replicas / Meilisearch for catalog  

Do **not** split Orders and Inventory across networks until you have a real reason — they need shared transactions.

## Cross-cutting

- **Idempotency keys** on checkout + webhook handlers  
- **Outbox / job enqueue** after DB commit for emails  
- **Health:** `GET /health` (liveness), `GET /ready` (DB + Redis)  
- **Observability:** request IDs, Sentry, pino JSON logs  

## Diagram to put in README

Draw: Buyer → Web → API → Postgres; API → Redis → Worker; API ↔ Stripe; Vendor dashboard → same API with vendor RBAC.
