# 11 — Security

## Auth & sessions

- Hash passwords with Argon2 or bcrypt  
- HTTP-only secure cookies (or short-lived access + rotating refresh)  
- Email verification before selling (vendor) strongly recommended  
- Password reset tokens single-use + expiry  

## RBAC

| Role | Can |
|------|-----|
| customer | cart, checkout, own orders, reviews |
| vendor | own shop, products, vendor_orders, earnings |
| admin | everything platform-scoped |

Enforce on **API**, not only UI. Vendor ID always from auth context.

## Hardening checklist

- [ ] Helmet, strict CORS allowlist  
- [ ] Rate limit auth + checkout (Redis)  
- [ ] Zod validation on all inputs  
- [ ] Stripe webhook signature verification  
- [ ] Signed, short-lived upload URLs; validate MIME/size  
- [ ] No secrets in repo; `.env.example` only  
- [ ] Parameterized queries via Prisma (no raw string SQL from users)  
- [ ] CSRF strategy if cookie-session browser calls  
- [ ] Audit log for admin/vendor money actions  
- [ ] Disable directory listing; security headers on reverse proxy  

## Marketplace-specific risks

| Risk | Mitigation |
|------|------------|
| Vendor price tampering at checkout | Server loads prices from DB |
| Oversell | Reservations + transaction on pay |
| Fake vendor shops | Admin approval + Stripe KYC |
| Commission bypass | Fee computed server-side; stored on order |
| IDOR on vendor orders | Scope queries by vendor_id |
| Webhook replay | Unique event id |

## Data privacy

- Store only needed PII  
- Don’t log full card data (Stripe handles PAN)  
- Redact secrets in logs  
- Simple privacy policy page for portfolio credibility  

## Dependency hygiene

- `pnpm audit` in CI  
- Lockfile committed  
- Dependabot optional  
