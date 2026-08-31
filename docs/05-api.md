# 05 — API

Base URL: `/api/v1`  
Format: JSON  
Validation: Zod on every write  
Errors: `{ error: { code, message, details? }, requestId? }`

Web client: `Authorization: Bearer <accessToken>` + `credentials: 'include'` for refresh cookie.  
Production cookies: `Secure`, `SameSite=None` when `NODE_ENV=production`.

## Auth

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/register` | role defaults to customer; merges guest cart if `X-Cart-Session` |
| POST | `/auth/login` | returns access token + sets refresh cookie |
| POST | `/auth/refresh` | **rotates** refresh cookie; new access token |
| POST | `/auth/logout` | revokes refresh; requires auth |
| POST | `/auth/forgot-password` | enqueues reset email (mock outbox if no SMTP) |
| POST | `/auth/reset-password` | single-use token; revokes refresh sessions |
| GET | `/auth/me` | current user + vendor profile if any |

Rate limits: in-memory on register/login/refresh/forgot/reset (see [11 — Security](./11-security.md)).

## Public catalog

| Method | Path | Notes |
|--------|------|-------|
| GET | `/shops` | list approved shops |
| GET | `/shops/:slug` | shop profile + paginated products |
| GET | `/shops/:slug/products/:productSlug` | PDP by shop + product slug |
| GET | `/products` | marketplace feed — `q`, `category`, `shop`, `minPrice`, `maxPrice`, `sort` |
| GET | `/products/:id` | PDP by id |
| GET | `/categories` | flat list |
| GET | `/search` | catalog search |
| GET | `/products/:productId/reviews` | paginated |
| POST | `/products/:productId/reviews` | auth; verified purchase required |

## Cart

| Method | Path | Auth |
|--------|------|------|
| GET | `/cart` | session or user |
| POST | `/cart/items` | `{ variantId, qty }` |
| PATCH | `/cart/items/:id` | qty |
| DELETE | `/cart/items/:id` | |
| DELETE | `/cart` | clear |

Guest cart: `X-Cart-Session` header. Merged into user cart on login/register.

## Checkout & orders (buyer)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/checkout/session` | Stripe Checkout Session; `Idempotency-Key` header; rate limited |
| GET | `/orders` | buyer’s orders |
| GET | `/orders/:id` | detail + vendor slices |
| POST | `/orders/:id/confirm-payment` | mock Stripe path only |

## Webhooks

| Method | Path | Notes |
|--------|------|-------|
| POST | `/webhooks/stripe` | raw body + signature verify; idempotent by event id |
| POST | `/webhooks/stripe/test` | mock payment (dev/demo) |

## Vendor

Prefix: `/vendor` — requires `vendor` role + approved profile where noted.

| Method | Path | Notes |
|--------|------|-------|
| POST | `/vendor/apply` | create pending vendor profile |
| GET | `/vendor/me` | shop summary |
| PATCH | `/vendor/shop` | name, bio, banner, policies |
| GET | `/vendor/dashboard` | widgets |
| POST | `/vendor/stripe/onboard` | Account Link URL |
| POST | `/vendor/stripe/refresh` | refresh onboarding link |
| GET | `/vendor/stripe/status` | charges/payouts flags |
| GET/POST | `/vendor/products` | list / create |
| GET/PATCH/DELETE | `/vendor/products/:id` | CRUD |
| POST/DELETE | `/vendor/products/:id/media` | add / remove media |
| GET | `/vendor/orders` | vendor order slices |
| GET | `/vendor/orders/:id` | |
| POST | `/vendor/orders/:id/fulfill` | optional step |
| POST | `/vendor/orders/:id/ship` | tracking optional |
| GET | `/vendor/earnings` | aggregates + debt hints |

## Admin

Prefix: `/admin` — `admin` role only. Finance routes share `/admin` prefix.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/admin/metrics` | GMV, orders, vendors, commission |
| GET | `/admin/finance` | commission by vendor, recent slices |
| GET | `/admin/vendors` | list / search |
| GET/PATCH | `/admin/vendors/:id` | approve / suspend |
| GET | `/admin/vendors/:id/ledger` | refund debt entries |
| GET | `/admin/orders` | all orders |
| GET | `/admin/orders/:id` | detail + debt per vendor slice |
| POST | `/admin/orders/:id/refund` | Stripe refund + ledger |
| POST | `/admin/vendor-orders/:vendorOrderId/retry-transfer` | Retry failed Connect payout |
| GET/PATCH | `/admin/settings` | commission_bps, debt threshold |
| GET | `/admin/audit-logs` | |
| POST | `/admin/products/:id/unpublish` | moderation |

## AI

Prefix: `/api/v1/ai`. See [15 — AI features](./15-ai-features.md).

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/ai/concierge` | optional | grounded product cards |
| POST | `/ai/listings/generate` | vendor approved | listing copilot draft |
| POST | `/ai/embeddings/reindex` | admin | queue or `?sync=1` |
| POST | `/ai/embeddings/reindex/:productId` | admin | single product |
| GET | `/ai/embeddings/status` | admin | index stats |

## Health

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | liveness |
| GET | `/ready` | Postgres connectivity (Redis not checked yet) |

## Conventions

- Pagination: `?page=&limit=` + `{ data, meta: { total, page, limit } }`  
- Money in responses: `_cents` fields  
- IDs: UUID  
- Vendor isolation: queries scoped by auth context — never trust client vendor id alone  
