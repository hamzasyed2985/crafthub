# 02 — Tech Stack

## Decisions at a glance

| Layer | Choice | Why |
|-------|--------|-----|
| Storefront + admin UI | **Next.js 15** (App Router) + TS + Tailwind | SEO, SSR, images, middleware, one app for buyer/vendor/admin routes |
| API | **Node + Express** | Clear REST surface, easy to containerize and test |
| ORM | **Prisma** | Typed models, migrations, good Postgres DX |
| Database | **PostgreSQL** | ACID for orders, inventory, payouts — required for money |
| Cache | **Redis** | Carts, rate limits, sessions, idempotency keys |
| Jobs | **BullMQ** | Emails, webhook retries, payout reconciliation |
| Auth | **Auth.js** or JWT + refresh | Multi-role (buyer / vendor / admin) |
| Payments | **Stripe Connect** (Express accounts) | Marketplace + separate vendor payouts |
| Media | **Cloudflare R2** or S3 | Product / shop images via signed uploads |
| Email | **Resend** or SES | Order, vendor approval, payout notices |
| Search (later) | Postgres FTS → **Meilisearch** | Start simple; upgrade when catalog grows |
| AI | **LLM API + pgvector** | Craft Concierge + vendor listing drafts — see [15 — AI](./15-ai-features.md) |
| Observability | **Sentry** + structured logs (pino) | Production maturity |
| Monorepo | **pnpm** + Turborepo (optional) | `apps/web`, `apps/api`, `apps/worker`, `packages/*` |
| CI/CD | **GitHub Actions** + Docker | Lint, test, build images, deploy |

## Why Next.js over plain React

E-commerce needs SEO for product and shop pages, server rendering, and secure cookie/session handling. Next.js covers that; a CRA/Vite SPA alone does not without extra work.

## Why PostgreSQL over MongoDB

Orders, stock decrements, commissions, and payouts need **transactions**. Postgres is the right ledger. Use document stores only later for analytics events if needed — not as the order source of truth.

## Why Stripe Connect (not plain Stripe Checkout alone)

Plain Stripe pays **you**. A marketplace must:

1. Charge the buyer once  
2. Split platform commission vs vendor share  
3. Pay vendors out on their connected accounts  

That is Stripe Connect (Express accounts are the practical student/portfolio choice).

## Why modular monolith (not full microservices)

One team (you). Clear module folders beat distributed systems early. Optionally extract **notifications** and **webhook workers** later for resume talking points. See [Architecture](./03-architecture.md).

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
    ui/           # Design system components
  infra/
    docker/       # Dockerfiles, compose
    nginx/        # Optional reverse proxy
  docs/           # This documentation
```

## Local tooling

- Node 20+
- pnpm
- Docker Desktop
- Stripe CLI (webhook forwarding)
- PostgreSQL + Redis via Compose
