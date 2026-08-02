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
  worker/    # BullMQ consumers (reservation expiry)
packages/
  db/        # Prisma schema + client
  shared/    # Zod schemas, enums
  ui/        # Design tokens + primitives
infra/docker/
docs/
tests/e2e/   # API end-to-end suites
```

## Local setup

Prerequisites: Node 20+, Docker Desktop, [pnpm](https://pnpm.io) 9+.

```bash
cp .env.example .env
docker compose -f infra/docker/docker-compose.yml up -d
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm --filter @crafthub/shared build
pnpm dev:api     # :4000
pnpm dev:web     # :3000
pnpm dev:worker  # reservation expiry (optional locally)
```

Seed accounts:

- Admin: `admin@crafthub.local` / `Admin123!`
- Vendor (pottery): `pottery@crafthub.local` / `Vendor123!` → `/shops/clay-ember`
- Vendor (wood): `wood@crafthub.local` / `Vendor123!` → `/shops/grain-groove`

## Phase 3 — Checkout & Stripe Connect

**Charge model:** one platform Checkout Session per cart; **separate charges & transfers** after `checkout.session.completed`. Platform keeps `commission_bps` (default 10%); each vendor receives item net + their flat shipping via Connect transfer (`transfer_group = orderId`).

### Mock mode (default without keys)

`.env.example` sets `E2E_STRIPE_MOCK=1`. With an empty `STRIPE_SECRET_KEY`, the API uses a mock Stripe adapter:

1. Vendor → `/vendor/onboarding` → **Connect with Stripe** (enables `charges_enabled` immediately)
2. Buyer adds cart → `/checkout` → Pay → redirected to `/checkout/success`
3. Success page posts a mock webhook → order becomes `paid`, stock decrements, transfers recorded

### Real Stripe test mode

1. Put `sk_test_…`, `pk_test_…`, and `whsec_…` in `.env`; unset `E2E_STRIPE_MOCK`
2. Forward webhooks: `stripe listen --forward-to localhost:4000/webhooks/stripe`
3. Complete Express onboarding for each vendor, then pay with test card `4242 4242 4242 4242`

Never mark an order paid from the browser success URL alone — webhooks are the source of truth.

### E2E

```bash
# API running with mock Stripe
pnpm test:e2e
```

Verify:

- `GET http://localhost:4000/health` → `{ "status": "ok" }`
- Multi-vendor cart → checkout → paid order after webhook
- Vendor `/vendor/orders` shows paid slices

## Phase 4 — Vendor ops

Vendors fulfill paid slices (`paid` → optional `fulfilling` → `shipped`), optionally add tracking, and see earnings from DB aggregates (`/vendor/earnings`, dashboard widgets). Buyers see shipment status and tracking on order detail.

Verify: pay an order → vendor marks shipped with tracking → buyer order shows tracking; earnings net/gross update.

## Phase 5 — Admin finance + vendor debt ledger

Admin metrics, order refunds, commission settings, and audit log. Refunds always hit Stripe; if a vendor transfer already paid out, CraftHub records a **refund_debt** ledger entry and **nets it against the next payout** (no Stripe transfer reversal). Vendors over the debt threshold get `ledgerReviewRequired`.

Verify: refund a paid order → statuses sync; next sale’s transfer is reduced by outstanding debt.

## Phase 6 — Trust & polish

Reviews (after shipped purchase), `/search` + header search, email outbox templates (`order.paid` / `shipped` / `refunded` / `vendor.approved`), dark-mode token parity.

### Demo script

1. Toggle **Dark** in the header — surfaces/text stay readable  
2. Search “mug” or “Islamabad” from `/search`  
3. Buyer: cart → checkout → pay (webhook) → vendor ships with tracking  
4. Buyer reviews the product on the PDP (verified purchase)  
5. Admin: `/admin` metrics → refund an order → vendor debt appears on earnings  
6. Check API logs / `email_outbox` for mock emails after pay/ship/refund/approve  

## Roadmap

See [docs/14-roadmap.md](./docs/14-roadmap.md).
