# 13 — Deployment

## Environments

| Env | Purpose |
|-----|---------|
| local | Compose + Stripe CLI |
| staging | Shared test; Stripe test mode |
| production | Live; Stripe live keys |

## Recommended paths

### Path A — Fast portfolio (default)

| Piece | Service |
|-------|---------|
| Web | Vercel |
| API + worker | Railway or Render (Docker) |
| Postgres | Neon or Railway |
| Redis | Upstash or Railway |
| Media | Cloudflare R2 |
| Email | Resend |

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
5. Run migrations  
6. Seed admin user + demo vendors (staging only)  
7. Deploy api → worker → web  
8. Point Stripe webhook to `https://api…/webhooks/stripe`  
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
APP_URL=                 # web origin
API_URL=
S3_ENDPOINT= S3_BUCKET= S3_ACCESS_KEY= S3_SECRET_KEY=
EMAIL_FROM= RESEND_API_KEY=
SENTRY_DSN=
COMMISSION_BPS=1000      # optional override; prefer DB settings
```

## Domains & TLS

- `crafthub.example` → web  
- `api.crafthub.example` → api  
- HTTPS only; secure cookies `SameSite` + `Secure`  

## Backups

- Managed Postgres automated backups on  
- Document restore drill once  

## Rollback

Redeploy previous image digest/tag. Migrations: prefer forward-fixed migrations; avoid destructive downs in prod.

## Production checklist

- [ ] HTTPS  
- [ ] Stripe live webhook verified  
- [ ] Admin user created securely (no default password in seed for prod)  
- [ ] Sentry receiving events  
- [ ] `/ready` used by platform  
- [ ] Privacy / terms stub pages  
- [ ] CORS limited to web origin  
