# 08 — Admin Panel

## Goals

Operate the marketplace: **trust** (vendor approval & listing moderation), **money** (commission, refunds, GMV), and **health** (metrics, audit, optional AI flags).

CraftHub has **three** control surfaces — don’t confuse them:

| Surface | Who | Doc |
|---------|-----|-----|
| Buyer storefront | Customers | [06 — Storefront](./06-storefront.md) |
| Vendor dashboard | Artisans | [07 — Vendor dashboard](./07-vendor-dashboard.md) |
| **Admin panel** | Platform operators | This file |

---

## Access

- Role `admin` only  
- Routes under `/admin` (Next.js) + `/api/v1/admin/*`  
- Enforce RBAC in **middleware and API** (UI hide is not security)  
- Optional later: 2FA, IP allowlist for prod  

---

## Information architecture

```
/admin
  ├── Overview (metrics + Needs attention inbox)
  ├── Vendors
  │     └── [id] detail / approve / suspend
  ├── Categories
  │     ├── taxonomy CRUD + feature for home
  │     └── pending craft suggestions
  ├── Orders
  │     └── [id] refund / vendor slices
  ├── Finance
  ├── Settings (commission, debt threshold)
  └── Audit log
```

### Needs attention (inbox)

Admins should not have to open every tab to find work. The dashboard **Needs attention** panel (and a badge on Admin nav) aggregates open queues:

| Queue | Source | Deep link |
|-------|--------|-----------|
| Seller applications | `VendorProfile.status = pending` | `/admin/vendors?status=pending` |
| Craft suggestions | `CategorySuggestion.status = pending` | `/admin/categories` |
| Ledger reviews | `ledgerReviewRequired` | `/admin/vendors?status=approved` |

API: `GET /admin/inbox` — counts + recent items. This is an **attention queue**, not push notifications or per-admin read/unread (that can come later).

---

## Route map

| Route | Purpose |
|-------|---------|
| `/admin` | Metrics overview + Needs attention inbox |
| `/admin/vendors` | List / filter by status (`pending`, `approved`, `suspended`) |
| `/admin/categories` | Craft taxonomy: create, feature, archive; review vendor suggestions |
| `/admin/orders` | All platform orders |
| `/admin/orders/[id]` | Multi-vendor breakdown; refund |
| `/admin/finance` | Commission, payouts, debt |
| `/admin/settings` | Commission bps, debt threshold |
| `/admin/audit-logs` | Who did what |

---

## Overview metrics (MVP)

| Metric | Meaning |
|--------|---------|
| GMV | Gross merchandise volume (paid orders) |
| Platform revenue | Sum of `commission_cents` |
| Orders | Count paid / refunded |
| Vendors | Active vs pending applications |
| Refund rate | Refunded / paid (simple %) |

Charts: 2–3 max (e.g. GMV by day, new vendors by week). Use design-system semantic colors.

---

## Vendor moderation

| Action | Effect |
|--------|--------|
| Approve | `pending` → `approved`; email vendor; they can complete Stripe & publish |
| Suspend | Hide shop + products from public; block checkout for those lines; email reason |
| Reinstate | Reverse suspend |

Always write `audit_logs` with actor, action, entity id, reason.

**Detail page should show:** bio, city, craft tags, Stripe `charges_enabled` / `payouts_enabled`, recent products, recent vendor_orders.

---

## Categories (craft taxonomy)

Platform-owned list used by Explore and product listings.

| Action | Effect |
|--------|--------|
| Create | New active category (`name`, `slug`, optional `featured` / `sortOrder`) |
| Feature | Appears on home “Shop by craft” curated strip |
| Archive | Hidden from public `GET /categories` and vendor pickers; existing products keep the FK |
| Approve suggestion | Creates category from vendor proposal; suggestion marked `approved` |
| Reject suggestion | Suggestion marked `rejected` (optional admin note) |

Vendors never create categories directly — they suggest; admin decides.

Always write `audit_logs` for create/update/suggestion review.

---

## Listing moderation

- Force **unpublish** / archive any product (counterfeit, prohibited, spam)  
- Optional AI risk score — **admin decides** ([AI features](./15-ai-features.md))  
- Note visible to vendor: “Removed by CraftHub — contact support”  

---

## Order ops

- Full platform order with **per-vendor slices** (`vendor_orders`)  
- Full or partial refund via Stripe; sync local status + inventory  
- Manual status override only with **required reason** + audit log  
- Do not let admin “edit commission” on a historical order row — refund/adjust via Stripe flows  

---

## Users

- Search by email  
- Ban abusive buyers (block login + checkout)  
- View order history (read-only)  

---

## Settings

| Setting | Notes |
|---------|-------|
| `commission_bps` | e.g. `1000` = 10%; applies to **new** checkouts only |
| Default currency | e.g. PKR / USD |
| Maintenance mode | Optional read-only storefront |

---

## Audit log

Record at least: vendor approve/suspend, refunds, commission changes, forced unpublish, **category create/update**, **category suggestion approve/reject**, user bans, AI-assisted actions taken.

UI: filter by actor, action type, date.

---

## Permissions matrix (quick)

| Capability | Admin | Vendor | Buyer |
|------------|-------|--------|-------|
| Approve vendors | ✓ | | |
| Manage categories / review suggestions | ✓ | suggest only | |
| Set commission | ✓ | | |
| Refund any order | ✓ | | |
| See all shops’ orders | ✓ | own only | own buy only |
| Edit any product | ✓ (moderation) | own | |
| Payout bank details | via Stripe Express | own Connect | |

---

## UX / design

- Denser tables and filters than the marketing site  
- **Same tokens** as storefront ([Design system](./10-design-system.md)) — ink/linen/clay, not a separate blue admin theme  
- Destructive actions use `ConfirmDialog`  
- Mobile: usable but desktop-first is fine for portfolio  

---

## Implementation tips

- TanStack Table for vendors/orders  
- Recharts for overview  
- Seed an `admin@crafthub.local` only on staging/dev  
- Demo script: approve vendor → watch shop go live → refund an order → show audit trail → manage categories / approve a craft suggestion  
