# 02 — Tech Stack

## Decisions at a glance

| Layer | Choice | Why |
|-------|--------|-----|
| Storefront + admin UI | **Next.js 15** (App Router) + TS + Tailwind | SEO, SSR for shop/PDP/home, one app for buyer/vendor/admin |
| API | **Node + Express** | Clear REST surface, easy to containerize and test |
| ORM | **Prisma** | Typed models, migrations, good Postgres DX |
| Database | **PostgreSQL** | ACID for orders, inventory, payouts |
| Redis | **BullMQ job queues** | Reservations, email outbox, embedding jobs — **not** HTTP cache |
| Jobs | **BullMQ** + `apps/worker` | Async work off the request path |
| Auth | **JWT access + httpOnly refresh** (rotation) | Multi-role buyer / vendor / admin; not Auth.js |
| Payments | **Stripe Connect** | Marketplace + separate vendor payouts |
| Media | **Cloudflare R2** or S3 (optional) | Signed uploads when configured; demo may use URLs |
| Email | Outbox + worker (mock log) | Templates for order/vendor/reset; Resend optional later |
| Search | Postgres + `GET /search` | Meilisearch deferred |
| AI | **Groq** chat (free tier) + mock/OpenAI embeddings | Concierge + Listing Copilot — [15 — AI](./15-ai-features.md) |
| Observability | **pino** + optional **Sentry** on API | Request IDs; not full APM |
| Monorepo | **pnpm** workspaces | `apps/web`, `apps/api`, `apps/worker`, `packages/*` |
| CI/CD | **GitHub Actions** | Typecheck + auth e2e smoke; Dockerfiles for Railway |
| Deploy | **Vercel + Railway** | Path A portfolio demo |

## Redis: queues vs caching

| Use | Implemented? |
|-----|----------------|
| BullMQ (reservations, email, embeddings) | Yes |
| Session store | No (JWT + refresh cookie) |
| HTTP / catalog response cache | No |
| Redis-backed rate limits | No (in-memory per API process) |

See [16 — Production readiness](./16-production-readiness.md).

## Why Next.js over plain React

E-commerce needs SEO for product and shop pages, server rendering, and secure cookie handling. Next.js covers that.

## Why PostgreSQL over MongoDB

Orders, stock decrements, commissions, and payouts need **transactions**. Postgres is the ledger.

## Why Stripe Connect

Plain Stripe pays the platform. A marketplace must charge once, take commission, and pay vendors via connected accounts.

## Why modular monolith

One team, clear module folders, shared transactions on checkout. Extract worker (already) or webhook ingress later if needed.

## Repo layout

```
crafthub/
  apps/
    web/          # Next.js (buyer, vendor, admin)
    api/          # Express API
    worker/       # BullMQ consumers
  packages/
    db/           # Prisma schema + client
    shared/       # Zod schemas, enums, constants
    ui/             # Design system components
  infra/
    docker/       # Dockerfile.api, Dockerfile.worker, compose
  docs/
  tests/e2e/      # API end-to-end suites
```

## Local tooling

- Node 20+
- pnpm
- Docker Desktop (Postgres + Redis)
- Stripe CLI (webhook forwarding for local test mode)
- Optional: Groq API key, OpenAI key for real embeddings
