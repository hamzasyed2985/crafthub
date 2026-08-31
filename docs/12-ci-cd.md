# 12 — CI/CD

## What runs today (`.github/workflows/ci.yml`)

| Job | What it does |
|-----|----------------|
| **quality** | `pnpm install`, `db:generate`, build `@crafthub/shared` + `@crafthub/db`, **`pnpm typecheck`** |
| **e2e-auth** | Postgres + Redis services, `db:push` + seed, start API, run **`tests/e2e/auth-edges.e2e.test.ts`** |

Triggers: push/PR to `main`, manual **workflow_dispatch**.

Badge in README links to this workflow.

## Not in CI yet (aspirational)

| Item | Notes |
|------|-------|
| ESLint / Prettier gate | Packages have placeholder lint scripts |
| Unit tests | Fee math, state machines — not wired |
| Full e2e suite | `trust-polish`, `ai`, checkout — run locally |
| Docker build on every PR | Dockerfiles exist for Railway; not built in Actions |
| Push images to GHCR | Manual / Railway git deploy today |
| Staging → prod CD pipeline | Single demo environment |
| `pnpm audit` | Recommended before production |

## Local e2e

```bash
# Prerequisites: Docker (Postgres + Redis), seed, API on :4000
pnpm test:e2e                              # all e2e
pnpm test:e2e -- tests/e2e/auth-edges.e2e.test.ts
pnpm test:e2e -- tests/e2e/trust-polish.e2e.test.ts
pnpm test:e2e -- tests/e2e/ai.e2e.test.ts
```

Use `E2E_STRIPE_MOCK=1` and `E2E_AI_MOCK=1` unless testing real keys.

## Docker (Railway)

| Image | Dockerfile |
|-------|------------|
| API | `infra/docker/Dockerfile.api` |
| Worker | `infra/docker/Dockerfile.worker` |
| Web | Built by Vercel (not Docker in repo CD) |

API listens on `process.env.PORT` (Railway) or `API_PORT` locally.

## CD today (manual Path A)

1. Push to `main` → Railway redeploys API/worker from GitHub  
2. Vercel redeploys web (`apps/web`, monorepo build)  
3. Env vars on Railway + Vercel (see [13 — Deployment](./13-deployment.md))  
4. Schema: `db:push` + seed for demo; use **`prisma migrate deploy`** for real prod  

## Secrets

Never commit: `DATABASE_URL`, `JWT_SECRET`, Stripe keys, `SENTRY_DSN`, `GROQ_API_KEY`, etc.  
Use host secret managers (Railway, Vercel).

## Target pipeline (production-grade)

```
PR:  lint → typecheck → unit → e2e (checkout + webhook) → docker build
main: build images → deploy staging → smoke → approve → deploy prod → migrate
```

See [16 — Production readiness](./16-production-readiness.md) for the gap list.
