# 01 — Overview

## What CraftHub is

A **multi-vendor marketplace** for local artisans (pottery, jewelry, woodwork, textiles, food crafts, etc.).

- Buyers browse a unified marketplace and individual vendor shops
- Vendors manage their own catalog, inventory, orders, and shop branding
- CraftHub takes a **commission** on each sale
- Vendors get **paid out separately** via Stripe Connect

This is **not** a single-store Shopify clone. The marketplace, commission, and payouts are the product.

## Problem it solves

Local makers lack an easy way to sell online with shared discovery, while buyers want one place to find authentic local craft — not generic dropshipped goods.

## User roles

| Role | Goal |
|------|------|
| **Buyer (customer)** | Discover artisans, buy products, track orders, leave reviews |
| **Vendor (seller)** | Onboard shop, list products, fulfill orders, view earnings |
| **Admin (platform)** | Approve vendors, set commission, moderate, handle disputes, see platform metrics |

## Core value loops

1. **Buyer:** Discover → PDP → Cart → Checkout → Track → Review  
2. **Vendor:** Apply → Get approved → List → Sell → Fulfill → Payout  
3. **Platform:** Commission on GMV → Trust via moderation → Grow supply + demand  

## In scope (MVP+)

- Multi-vendor catalog with per-vendor storefronts
- Cart / checkout with Stripe Connect
- Commission + vendor payouts
- Vendor dashboard (products, inventory, orders, earnings)
- Admin panel (vendors, orders, refunds, settings)
- Auth (buyer + vendor + admin), email notifications
- Search / filters, reviews, dark mode design system
- **AI:** Craft Concierge (catalog-grounded) + Vendor Listing Copilot — see [15 — AI](./15-ai-features.md)
- Docker + CI/CD + deployed demo (Vercel + Railway)

## Out of scope (v1)

- Native mobile apps
- Live chat / messaging between buyer and vendor (optional later)
- Complex logistics / courier integrations (use flat/manual shipping first)
- Full ERP / accounting export suites
- Multi-currency beyond one primary currency

## Success criteria (portfolio)

- Live demo URL with seeded vendors and products
- Real Stripe test-mode Connect flow (buyer pays → vendor balance updates)
- Admin can approve vendor and adjust commission
- README with architecture diagram + tradeoffs
- Green CI (typecheck + auth e2e smoke; see [12 — CI/CD](./12-ci-cd.md))
- Short demo video: browse shop → checkout → vendor sees order → payout view

## Suggested branding notes

- Name: **CraftHub**
- Tone: warm, local, handmade — not corporate SaaS purple
- Visual: clay / ink / linen neutrals; see [Design system](./10-design-system.md)

## Production-grade engineering (portfolio)

This is a **personal portfolio project** — built with the same architecture and patterns as production marketplace apps (webhooks, queues, RBAC, deploy), but **not** intended as a real product launch. Stripe **test mode** (or mock) is the target; see **[16 — Production-grade engineering](./16-production-readiness.md)** for what’s done vs optional polish.
