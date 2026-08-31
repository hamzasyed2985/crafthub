# 16 — Production-grade engineering (portfolio goal)

**Use this doc for LinkedIn, interviews, and “what’s left?”**

## What this project is (and is not)

| | |
|---|---|
| **Is** | A personal portfolio project built with the **same patterns real teams use** — modular monolith, webhooks, idempotency, worker queues, RBAC, deploy to cloud, CI |
| **Is not** | A product you launch to real customers, live money, or a business you operate |

**Stripe:** use **test mode** keys (or mock adapter). That is the intended end state — not a gap to “fix before launch.”

**Goal:** When someone asks *“how would you build a marketplace?”*, this repo shows you did it — architecture, money path, async jobs, auth hardening — without pretending to be a live SaaS.

---

## How to describe maturity (interviews)

| Label | What it means here |
|-------|---------------------|
| **Portfolio complete** | Live URL, demo flows work, README + diagram, CI green |
| **Production-grade engineering** | Same *building blocks* as prod apps (below) — most are done |
| **Production launch** | **Out of scope** — live Stripe, legal pages, real email at scale, multi-env ops |

Say: *“Built and deployed like a production marketplace stack; Stripe test mode; not shipping to real users.”*

---

## Production-grade patterns — implemented

These are what interviewers and senior engineers look for. **You have them.**

### Architecture & deploy

- Modular monolith (Express domains, shared Prisma DB)
- Separate **worker** process (BullMQ on Redis)
- **Docker** images for API + worker; **Vercel + Railway** deploy
- Health endpoints; structured logging (pino); optional Sentry on API

### Marketplace money path

- Multi-vendor cart → single checkout session
- **Stripe Connect** onboarding (test or mock)
- **Webhook-driven** order paid (not browser-only success)
- Idempotency on checkout + webhook dedup
- Inventory **reservations** + worker TTL expiry
- Platform commission + Connect transfers + **refund debt ledger**

### Auth & API hygiene

- JWT access + **httpOnly refresh** with **rotation**
- Forgot / reset password flow
- Rate limits on auth + checkout (in-memory)
- Zod validation, RBAC, CORS allowlist, Helmet
- `X-Request-Id` on errors

### Async & data

- Email **outbox** pattern (worker delivery — mock log is fine for portfolio)
- Embedding reindex jobs (async, not on request path)
- Shared Zod schemas across web + API

### Product surface

- Buyer, vendor, admin flows end-to-end
- Search, reviews, Explore filters, AI Concierge + Listing Copilot
- Auth e2e smoke in GitHub Actions

---

## Remaining work — to match “how prod teams build” (optional polish)

Prioritized for **engineering credibility**, not for launching a business. Skip anything that doesn’t interest you.

### Worth doing (shows completeness)

| Item | Why it matters in interviews | Status |
|------|------------------------------|--------|
| **Stripe test** path verified once | “Real” Checkout + webhook + Connect, not only mock | Env-dependent; mock OK |
| **Checkout / webhook e2e in CI** | Proves money path doesn’t regress | Auth e2e only today |
| **Prisma migrations** in repo (`migrate`, not only `db push`) | How teams ship schema changes | Push used for demo |
| **Lint in CI** | Matches “quality gate” story | Typecheck only |
| **Sentry** — trigger one test error | Prove observability wiring | Optional DSN |

### Nice-to-have (depth, not required for portfolio)

| Item | Why | Status |
|------|-----|--------|
| Redis-backed rate limits | Multi-instance API pattern | In-memory today |
| `/ready` checks Redis | Honest health for worker dependency | DB-only today |
| Broader e2e (vendor fulfill, admin refund) | Regression safety | Run locally |
| HTTP cache / CDN notes implemented | Scale talking point | Deferred — fine for portfolio |
| Meilisearch / real embeddings | Search/AI depth | Postgres + mock OK |
| R2 media pipeline wired | Upload story | Optional |

### Explicitly out of scope (you said no real-world product)

Do **not** treat these as todo for this project:

- Stripe **live** keys, KYC, live webhooks
- Removing seed passwords “for production” (demo logins are fine for a public portfolio URL)
- Privacy / terms legal pages
- Staging + production business split, uptime SLAs, on-call
- Real transactional email (Resend) unless you want it for demo polish
- Email verification, disputes, messaging

---

## Caching — do you need it?

**No**, for a portfolio project with demo traffic.

Redis today = **BullMQ job queues** (reservations, email outbox, embeddings). That is a legitimate production pattern. You do not need a separate HTTP cache layer to claim “production-grade engineering.”

---

## Suggested “done” definition for this repo

You can call the project **complete** when:

1. Live demo URL works (browse → cart → checkout → order → vendor sees it)
2. Stripe **test** OR mock path demonstrated in README / Loom
3. CI green (typecheck + auth e2e)
4. README case study + architecture diagram
5. This doc reflects what you built vs optional polish

Everything in **Explicitly out of scope** is intentionally not required.

---

## Doc map

| Question | Read |
|----------|------|
| Vision & success criteria | [01 Overview](./01-overview.md) |
| Backend shape | [03 Architecture](./03-architecture.md) |
| API routes | [05 API](./05-api.md) |
| Deploy / Stripe test setup | [13 Deployment](./13-deployment.md) |
| Phases | [14 Roadmap](./14-roadmap.md) |
| **Engineering checklist** | **This file** |
