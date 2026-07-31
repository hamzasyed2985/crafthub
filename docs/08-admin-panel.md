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
  ├── Overview (metrics)
  ├── Vendors
  │     └── [id] detail / approve / suspend
  ├── Products (moderation)
  ├── Orders
  │     └── [id] refund / vendor slices
  ├── Users (buyers)
  ├── Settings (commission, flags)
  ├── Audit log
  └── AI review (optional)     ← see 15-ai-features.md
```

---

## Route map

| Route | Purpose |
|-------|---------|
| `/admin` | Metrics overview |
| `/admin/vendors` | List / filter by status (`pending`, `approved`, `suspended`) |
| `/admin/vendors/[id]` | Profile, Stripe flags, approve / suspend / reinstate |
| `/admin/products` | Search listings; force unpublish |
| `/admin/products/[id]` | Inspect media, vendor, AI risk (if enabled) |
| `/admin/orders` | All platform orders |
| `/admin/orders/[id]` | Multi-vendor breakdown; refund |
| `/admin/users` | Lookup buyer; ban / unban |
| `/admin/settings` | Commission bps, maintenance mode |
| `/admin/audit-logs` | Who did what |
| `/admin/ai/queue` | Optional moderation suggestions |

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

**Detail page should show:** bio, city, craft categories, Stripe `charges_enabled` / `payouts_enabled`, recent products, recent vendor_orders.

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

Record at least: vendor approve/suspend, refunds, commission changes, forced unpublish, user bans, AI-assisted actions taken.

UI: filter by actor, action type, date.

---

## Permissions matrix (quick)

| Capability | Admin | Vendor | Buyer |
|------------|-------|--------|-------|
| Approve vendors | ✓ | | |
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
- Demo script: approve vendor → watch shop go live → refund an order → show audit trail  
