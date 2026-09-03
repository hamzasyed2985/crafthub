# 07 — Vendor Dashboard

## Goals

Give artisans a simple “run my shop” cockpit: onboarding, catalog, orders, earnings.

## Access

- Role `vendor`
- Most routes require `vendor_profiles.status === approved`
- Onboarding routes allowed while `pending`

## Route map

| Route | Purpose |
|-------|---------|
| `/vendor/apply` | Application form |
| `/vendor/onboarding` | Checklist: profile → Stripe → first product |
| `/vendor` | Dashboard home |
| `/vendor/shop` | Edit shop branding & policies |
| `/vendor/products` | Product list |
| `/vendor/products/new` | Create product |
| `/vendor/products/[id]` | Edit product / variants / media |
| `/vendor/orders` | Incoming vendor orders |
| `/vendor/orders/[id]` | Fulfill / mark shipped |
| `/vendor/earnings` | Balance, commission breakdown, payout history |
| `/vendor/stripe` | Connect onboarding / refresh |

## Onboarding checklist

1. Submit apply (bio, city, **craft tags**, attestation checkbox)  
2. Admin approves  
3. Shop branding & policies (logo or banner + shipping + returns)  
4. Complete Stripe Connect Express onboarding (`charges_enabled` **and** `details_submitted` / `onboarding_complete`)  
5. Publish first **active** product (must pick a **category**)  

Pending vendors can edit shop + onboarding only; Orders / Products / Earnings require approval.

Block “Go live” / green Connected until Stripe `charges_enabled` **and** `onboarding_complete`.

## Dashboard home widgets

- Orders to fulfill (count)
- Low stock variants
- Revenue (7d / 30d) — **vendor net**, not GMV
- Stripe account status banner if incomplete

## Products

- Draft / active / archived  
- Variants: price_cents, stock, SKU, attributes  
- Multi-image upload (URL for MVP; signed upload later)  
- **Category assignment** — required to set status `active`  
- If the craft is missing: use **Other**, or **Suggest a category** (admin reviews; approve adds it to the platform list)  
- Optional listing copilot: AI may suggest an **existing** active category name only  

Craft tags on the shop profile are separate from product categories — tags describe the maker; categories classify each listing.  

## Orders

- List filters: paid, fulfilling, shipped, delivered  
- Detail: buyer shipping address, line items, earnings for this order  
- Actions: mark fulfilling, mark shipped (+ optional tracking), mark delivered  

Vendors **cannot** see other vendors’ data. Vendors **cannot** change platform commission.

## Earnings

Show clearly:

| Field | Meaning |
|-------|---------|
| Gross sales | Sum of item prices before commission |
| Commission | CraftHub fee |
| Net | What vendor earns |
| Pending | Paid orders not yet transferred |
| Paid out | Completed transfers |

Link to Stripe Express dashboard for tax/payout bank details when useful.

## Notifications (email)

- New order  
- Payout sent  
- Admin suspended shop  
- Low stock (optional job)  
