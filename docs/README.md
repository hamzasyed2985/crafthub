# CraftHub Documentation

**CraftHub** is a local-artisan, multi-vendor e-commerce marketplace. Independent sellers run their own storefronts, manage inventory, and receive payouts after CraftHub takes a commission.

## How to read these docs

Start with [01 — Overview](./01-overview.md), then work top-to-bottom. Each file is one topic.

**Looking for “what’s left?” (engineering checklist, not launch todo)** → **[16 — Production-grade engineering](./16-production-readiness.md)**.

| # | Doc | What it covers |
|---|-----|----------------|
| 01 | [Overview](./01-overview.md) | Vision, users, scope, success criteria |
| 02 | [Tech stack](./02-tech-stack.md) | Frontend, backend, DB, infra choices |
| 03 | [Architecture](./03-architecture.md) | Modular monolith, services, data flow |
| 04 | [Domain model](./04-domain-model.md) | Entities, relationships, order states |
| 05 | [API](./05-api.md) | REST surface by domain |
| 06 | [Storefront](./06-storefront.md) | Buyer-facing UX & pages |
| 07 | [Vendor dashboard](./07-vendor-dashboard.md) | Seller tools & storefront management |
| 08 | [Admin panel](./08-admin-panel.md) | Platform ops, moderation, finance |
| 09 | [Payments & payouts](./09-payments-payouts.md) | Stripe Connect, commission, webhooks |
| 10 | [Design system](./10-design-system.md) | Brand, tokens, dark mode, components (deep) |
| 11 | [Security](./11-security.md) | Auth, RBAC, hardening |
| 12 | [CI/CD](./12-ci-cd.md) | Docker, GitHub Actions pipeline |
| 13 | [Deployment](./13-deployment.md) | Environments & ship checklist |
| 14 | [Roadmap](./14-roadmap.md) | Build phases & verification |
| 15 | [AI features](./15-ai-features.md) | Concierge, listing copilot — not a generic bot |
| 16 | [Production-grade engineering](./16-production-readiness.md) | Portfolio goal: built like prod apps; **not** a real launch |

## Quick stack

- **Web:** Next.js (App Router) + TypeScript + Tailwind
- **API:** Node.js + Express (modular monolith)
- **DB:** PostgreSQL + Prisma
- **Jobs:** Redis + BullMQ (queues — not HTTP cache)
- **Payments:** Stripe Connect (marketplace)
- **Ops:** Docker Compose, GitHub Actions, optional Sentry
