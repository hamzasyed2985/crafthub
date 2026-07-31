# 05 — API

Base URL: `/api/v1`  
Format: JSON  
Validation: Zod on every write  
Errors: `{ error: { code, message, details? } }`

## Auth

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/register` | role defaults to customer |
| POST | `/auth/login` | returns session/JWT |
| POST | `/auth/logout` | |
| POST | `/auth/forgot-password` | |
| POST | `/auth/reset-password` | |
| GET | `/auth/me` | current user + vendor profile if any |

## Public catalog

| Method | Path | Notes |
|--------|------|-------|
| GET | `/shops` | list approved shops (search, city filter) |
| GET | `/shops/:slug` | shop profile + policies |
| GET | `/products` | marketplace feed (filters: category, price, shop, q) |
| GET | `/products/:id` | PDP data |
| GET | `/categories` | tree or flat |
| GET | `/products/:id/reviews` | paginated |

## Cart

| Method | Path | Auth |
|--------|------|------|
| GET | `/cart` | session or user |
| POST | `/cart/items` | `{ variantId, qty }` |
| PATCH | `/cart/items/:id` | qty |
| DELETE | `/cart/items/:id` | |
| DELETE | `/cart` | clear |

Merge guest cart into user cart on login.

## Checkout & orders (buyer)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/checkout/session` | creates order draft + Stripe session/intent; returns `clientSecret` or URL |
| GET | `/orders` | buyer’s orders |
| GET | `/orders/:id` | detail + vendor slices |
| POST | `/orders/:id/cancel` | only if still cancellable |

## Webhooks

| Method | Path | Notes |
|--------|------|-------|
| POST | `/webhooks/stripe` | raw body + signature verify; idempotent by event id |

## Vendor

Prefix: `/vendor` — requires `vendor` role + approved profile (except onboarding).

| Method | Path | Notes |
|--------|------|-------|
| POST | `/vendor/apply` | create pending vendor profile |
| GET | `/vendor/me` | shop + stripe status |
| PATCH | `/vendor/shop` | name, bio, banner, policies |
| POST | `/vendor/stripe/onboard` | Account Link URL |
| GET | `/vendor/stripe/status` | charges/payouts flags |
| GET/POST | `/vendor/products` | list / create |
| PATCH/DELETE | `/vendor/products/:id` | update / archive |
| POST | `/vendor/products/:id/media` | get signed upload URL |
| GET | `/vendor/orders` | vendor_orders for this shop |
| GET | `/vendor/orders/:id` | |
| POST | `/vendor/orders/:id/ship` | tracking number optional |
| GET | `/vendor/earnings` | balances, recent transfers |

## Admin

Prefix: `/admin` — `admin` role only.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/admin/metrics` | GMV, orders, vendors, commission |
| GET/PATCH | `/admin/vendors/:id` | approve / suspend |
| GET | `/admin/orders` | all orders |
| POST | `/admin/orders/:id/refund` | full/partial |
| GET/PATCH | `/admin/settings` | commission_bps |
| GET | `/admin/audit-logs` | |

## Health

| Method | Path |
|--------|------|
| GET | `/health` |
| GET | `/ready` |

## Conventions

- Pagination: `?page=&limit=` + `{ data, meta: { total, page, limit } }`  
- Money in responses: always `_cents` fields  
- IDs: ULID or UUID  
- Vendor isolation: every vendor query filters by `vendor_id` from auth context — never from client body alone  
