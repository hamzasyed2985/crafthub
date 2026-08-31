# 11 — Security

## Auth & sessions (implemented)

- Passwords hashed with **bcrypt**  
- Short-lived **JWT access** in client storage + **httpOnly refresh cookie**  
- **Refresh rotation** on `POST /auth/refresh`; old refresh revoked  
- Web client retries API once after refresh on 401  
- **Forgot / reset password** with hashed single-use tokens + expiry  
- Logout revokes refresh token  

Email verification before selling is **recommended** but not implemented.

## RBAC

| Role | Can |
|------|-----|
| customer | cart, checkout, own orders, reviews |
| vendor | own shop, products, vendor_orders, earnings |
| admin | platform-scoped moderation, finance, settings |

Enforce on **API**, not only UI. Vendor ID always from auth context.

## Hardening checklist

| Item | Status |
|------|--------|
| Helmet | Done |
| Strict CORS allowlist (`CORS_ORIGIN`) | Done |
| Rate limit auth + checkout | Done (in-memory, per process) |
| Rate limit AI endpoints | Done (in-memory) |
| Zod validation on writes | Done |
| Stripe webhook signature verification | Done |
| Signed upload URLs; MIME/size validation | Partial (when R2 configured) |
| No secrets in repo; `.env.example` only | Done |
| Prisma parameterized queries | Done |
| Cross-origin cookies (`Secure`, `SameSite=None` in prod) | Done |
| Audit log for admin money actions | Done |
| `X-Request-Id` on errors | Done |
| Redis-backed / edge rate limits | **Not done** |
| `pnpm audit` in CI | **Not done** |
| Privacy / terms pages | **Not done** |

## Marketplace-specific risks

| Risk | Mitigation |
|------|------------|
| Vendor price tampering at checkout | Server loads prices from DB |
| Oversell | Reservations + decrement on paid webhook |
| Fake vendor shops | Admin approval + Stripe KYC |
| Commission bypass | Fee computed server-side; stored on order |
| IDOR on vendor orders | Scope queries by vendor_id |
| Webhook replay | Unique event id storage |
| Refresh token theft | httpOnly cookie + rotation |

## Data privacy

- Store only needed PII  
- Don’t log full card data (Stripe handles PAN)  
- Redact secrets in logs  
- Demo seed passwords must not be used on public production DB  

## Dependency hygiene

- Lockfile committed  
- `pnpm audit` in CI — **not yet**  
- Dependabot — optional  

See [16 — Production readiness](./16-production-readiness.md) for full remaining security/ops items.
