# 12 — CI/CD

## Goals

Every PR proves the app still builds and critical money paths don’t break. Main deploys versioned Docker images.

## Tooling

- GitHub Actions  
- Docker multi-stage builds (`web`, `api`, `worker`)  
- pnpm cache  
- Compose services in CI: Postgres + Redis  

## CI pipeline (pull requests)

```
lint → typecheck → unit tests → integration tests → docker build
```

| Job | What |
|-----|------|
| Lint | ESLint + Prettier check |
| Typecheck | `tsc` for web + api |
| Unit | fees, order state transitions, inventory math |
| Integration | API + Postgres: checkout reservation, webhook idempotency |
| Build | Build three images; tag with SHA (no push required on PR) |

Optional: Playwright smoke against Compose (browse + login).

## CD pipeline (main)

1. Build & push images to GHCR (`crafthub-web`, `crafthub-api`, `crafthub-worker`)  
2. Tag `:sha` and `:latest` (or `:main`)  
3. Deploy **staging** automatically  
4. Deploy **production** with manual approval  
5. Run migrations as a release step (`prisma migrate deploy`)  
6. Hit `/health` and `/ready`  

## Dockerfile expectations

- Multi-stage: deps → build → runtime  
- Non-root user  
- `NODE_ENV=production`  
- Only needed files copied  

## Local parity

`docker compose up` runs web, api, worker, postgres, redis, mailpit (optional).

Same images CI builds should run locally (or close).

## Secrets in GitHub

- `DATABASE_URL`, `REDIS_URL`  
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CLIENT_ID` (Connect)  
- `NEXTAUTH_SECRET` / JWT secret  
- Registry credentials  

Never echo secrets in logs.

## Badge & README

Show CI status badge. Mention “Dockerized multi-service deploy” on the resume bullet.
