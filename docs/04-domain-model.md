# 04 — Domain Model

## Entity map (core)

```
User ──< VendorProfile >── Shop
  │                            │
  │                            ├── Product ── ProductVariant ── Media
  │                            │
  │                            └── PayoutAccount (Stripe Connect id)

User ── Cart ── CartItem → Variant

User ── Order ── OrderItem → Variant (snapshot)
              └── VendorOrder (per vendor slice)
                    └── PaymentAllocation / Transfer

PlatformSettings (commission_bps, etc.)
Review → Product + User
AuditLog → actor User
```

## Tables (MVP)

### Identity

| Table | Purpose |
|-------|---------|
| `users` | email, password_hash, role (`customer` \| `vendor` \| `admin`), status |
| `sessions` / refresh tokens | If not using Auth.js session store |
| `addresses` | shipping/billing per user |

### Vendor

| Table | Purpose |
|-------|---------|
| `vendor_profiles` | user_id, display_name, slug, bio, logo, banner, status (`pending` \| `approved` \| `suspended`) |
| `shops` | vendor_id, policies, location/city, shipping defaults |
| `stripe_accounts` | vendor_id, stripe_account_id, onboarding_complete, charges_enabled, payouts_enabled |

### Catalog

| Table | Purpose |
|-------|---------|
| `categories` | name, slug, parent_id |
| `products` | shop_id, title, slug, description, status, category_id |
| `product_variants` | product_id, sku, price_cents, currency, stock_qty, attributes (JSON) |
| `media` | product_id or shop_id, storage_key, alt, sort_order |

### Cart & orders

| Table | Purpose |
|-------|---------|
| `carts` | user_id or `session_id` |
| `cart_items` | cart_id, variant_id, quantity |
| `orders` | buyer_id, status, totals, shipping address snapshot |
| `vendor_orders` | order_id, vendor_id, status, subtotal, commission_cents, vendor_net_cents |
| `order_items` | vendor_order_id, variant snapshot (title, sku, unit_price), qty |
| `inventory_reservations` | variant_id, qty, expires_at, order_id nullable |

### Money

| Table | Purpose |
|-------|---------|
| `payments` | order_id, provider, payment_intent_id, status, amount_cents, application_fee_cents |
| `payment_events` | stripe event id (unique), type, payload meta — idempotency |
| `payouts` | vendor_id, amount_cents, stripe_transfer_id, status, period |
| `platform_settings` | commission_bps (e.g. 1000 = 10%), currency |

### Social / trust

| Table | Purpose |
|-------|---------|
| `reviews` | product_id, user_id, rating, body, verified_purchase |
| `audit_logs` | actor_id, action, entity, meta JSON |

## Money fields

Always store money as **integer cents**. Never floats.

## Order status machine

### Platform `orders.status`

`pending_payment` → `paid` → `processing` → `completed` | `cancelled` | `refunded`

### Per-vendor `vendor_orders.status`

`awaiting_payment` → `paid` → `fulfilling` → `shipped` → `delivered` | `cancelled` | `refunded`

Vendors only transition their own `vendor_orders` (with rules). Platform admin can override with audit log.

## Inventory rules

1. On checkout start: create **reservations** with TTL  
2. On payment success: convert reservations → stock decrement  
3. On expire/cancel: release reservations  
4. Never decrement stock only on “redirect success” — wait for webhook  

## Commission

```
commission_cents = floor(item_subtotal_cents * commission_bps / 10000)
vendor_net_cents = item_subtotal_cents - commission_cents
```

Shipping can be platform-collected or vendor-collected — pick one for MVP and stick to it (recommend: **vendor sets flat shipping per shop**, included in that vendor’s slice).

## Slugs

- Shop: `/shops/:shopSlug`  
- Product: `/shops/:shopSlug/products/:productSlug` or `/products/:id` with canonical shop URL  

Unique constraint: `(shop_id, product_slug)`.
