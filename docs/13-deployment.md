# 13 — Deployment

## Environments

| Env | Purpose |
|-----|---------|
| local | Compose + Stripe CLI |
| staging | Shared test; Stripe test mode |
| production | Live; Stripe live keys |

## Recommended paths

### Path A — Fast portfolio (default) — **what CraftHub uses**

| Piece | Service |
|-------|---------|
| Web | Vercel (`apps/web`, `NEXT_PUBLIC_API_URL=https://…`) |
| API + worker | Railway (Dockerfile.api / Dockerfile.worker) |
| Postgres | Railway Postgres |
| Redis | Railway Redis (**BullMQ queues**, not HTTP caching) |
| Media | Cloudflare R2 (optional) |
| Email | Resend (optional; mock outbox works for demo) |
| Errors | Sentry (`SENTRY_DSN` on API) |

### Path B — Docker-forward

All app containers on **Fly.io** or **Render** native Docker; managed Postgres; Upstash Redis.

### Path C — Cloud resume flex

AWS: ECR + ECS Fargate + ALB + RDS Postgres + ElastiCache Redis + S3 + GitHub OIDC deploy.

Pick **A or B** unless targeting DevOps roles.

## Deploy steps (generic)

1. Provision Postgres + Redis; save URLs  
2. Create R2/S3 bucket + API token  
3. Create Stripe Connect platform; set brand + redirect URLs  
4. Set env vars on hosts (see below)  
5. Run migrations / `db:push` + seed (demo)  
6. Deploy api → worker → web  
7. Point Stripe webhook to `https://api…/webhooks/stripe`  
8. Set `APP_URL` + `CORS_ORIGIN` to the Vercel origin; redeploy API  
9. Verify Connect onboarding return URLs  
10. Smoke test: register → apply vendor → approve → onboard Stripe → buy → webhook paid  

## Critical env vars

```
DATABASE_URL=
REDIS_URL=
JWT_SECRET= or AUTH_SECRET=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_CLIENT_ID=
APP_URL=                 # web origin (Vercel URL)
CORS_ORIGIN=             # same as APP_URL
NEXT_PUBLIC_API_URL=     # https://api… (must include scheme)
S3_ENDPOINT= S3_BUCKET= S3_ACCESS_KEY= S3_SECRET_KEY=
EMAIL_FROM= RESEND_API_KEY=
SENTRY_DSN=
GROQ_API_KEY= E2E_AI_MOCK=0
COMMISSION_BPS=1000      # optional override; prefer DB settings
```

## Domains & TLS

- Vercel → web  
- Railway public domain → api  
- HTTPS only; secure cookies `SameSite=None` + `Secure` in production  

## Backups

- Managed Postgres automated backups on  
- Document restore drill once  

## Rollback

Redeploy previous image digest/tag. Migrations: prefer forward-fixed migrations; avoid destructive downs in prod.

## Production checklist

- [x] HTTPS (Vercel + Railway)  
- [ ] Stripe **test** webhook verified (optional for portfolio; mock works)  
- [ ] Admin user created securely (no default password in seed for real prod)  
- [ ] Sentry receiving events (`SENTRY_DSN` on Railway API)  
- [x] `/ready` used for DB readiness  
- [ ] Privacy / terms stub pages  
- [x] CORS limited to web origin  

## Load notes (demo scale)

Single API replica is enough for portfolio traffic. Expected hotspots if load grows:

| Area | Why | Mitigation later |
|------|-----|------------------|
| `GET /products` + search | Uncached catalog scans | CDN / short Redis cache / Meilisearch |
| Checkout + webhooks | Writes + Stripe latency | Keep idempotency; scale API replicas carefully |
| Embedding reindex | CPU/IO burst | Keep async via BullMQ; never on request path |
| Concierge (Groq) | Upstream rate limits | In-memory AI rate limit already; upgrade Groq tier if needed |
| Worker sweep | 1‑min reservation job | One worker replica is fine for demo |

**Redis role today:** BullMQ only (reservations, email outbox, embeddings) — **not** a general response cache. That was a conscious Phase 7 cut for demo scope.

## Turning on AI (Groq) in the live demo

1. Free key: https://console.groq.com/keys (paid only if you outgrow free limits)  
2. Railway **api** vars: `GROQ_API_KEY=…`, `E2E_AI_MOCK=0`  
3. Redeploy API  
4. Optional admin: `POST /api/v1/ai/embeddings/reindex?sync=1` with admin token  
5. Concierge + Listing Copilot should use live chat; embeddings stay mock without OpenAI  

## Turning on Stripe test mode in the live demo

1. Stripe Dashboard → **Test mode** keys (`sk_test_`, `pk_test_`)  
2. Railway **api**: set keys, `E2E_STRIPE_MOCK=0`, `STRIPE_WEBHOOK_SECRET=whsec_…`  
3. Webhook endpoint: `https://YOUR-API.up.railway.app/webhooks/stripe`  
4. Vendors complete Connect onboarding (test)  
5. Pay with `4242…`; confirm order `paid` via webhook  

**Live Stripe money** needs a real platform account, KYC, and live keys — not required for the portfolio URL.

## Sentry

1. Create a Sentry project (Node / Express)  
2. Copy DSN → Railway **api** `SENTRY_DSN=`  
3. Redeploy; unhandled 5xx and rejections are reported  
4. Leave unset locally if you do not want noise  
