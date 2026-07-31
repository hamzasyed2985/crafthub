# CraftHub

Local-artisan **multi-vendor marketplace**: independent sellers run storefronts, manage inventory, and get paid out after CraftHub takes a commission.

## Documentation

All project specs live in **[docs/](./docs/README.md)** — one topic per file.

Start here: [docs/01-overview.md](./docs/01-overview.md)

## Stack

Next.js · Tailwind CSS · Express · PostgreSQL · Redis · BullMQ · Stripe Connect · Docker · GitHub Actions · TypeScript

## Repo layout

```
apps/
  web/       # Next.js (buyer, vendor, admin)
  api/       # Express API
  worker/    # BullMQ consumers (stub in Phase 0)
packages/
  db/        # Prisma schema + client
  shared/    # Zod schemas, enums
  ui/        # Design tokens + primitives
infra/docker/
docs/
```

## Local setup (Phase 0)

Prerequisites: Node 20+, Docker Desktop, [pnpm](https://pnpm.io) 9+.

```bash
cp .env.example .env
docker compose -f infra/docker/docker-compose.yml up -d
pnpm install
pnpm db:generate
pnpm db:push
pnpm --filter @crafthub/shared build
pnpm dev:api    # :4000
pnpm dev:web    # :3000
```

Verify:

- `GET http://localhost:4000/health` → `{ "status": "ok" }`
- `GET http://localhost:4000/ready` → `{ "status": "ready" }`
- Register at `/register`, then open `/account`

## Roadmap

See [docs/14-roadmap.md](./docs/14-roadmap.md). Phase 0 = foundation (this scaffold). Next: vendors & catalog.
