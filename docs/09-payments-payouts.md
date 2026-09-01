# 09 — Payments & Payouts

## Model

CraftHub is a **marketplace**. Use **Stripe Connect** with **Express** connected accounts for vendors.

### Money flow (recommended MVP)

1. Buyer pays CraftHub (platform is merchant of record for the charge)  
2. PaymentIntent / Checkout uses Connect **destination charges** or **separate charges & transfers**  
3. `application_fee_amount` = platform commission  
4. Vendor net goes to connected account balance  
5. Stripe pays out vendors to their bank on Stripe’s schedule (or manual transfers if you choose)

Document the exact Connect charge type in README once implemented.

## Commission

- Stored in `platform_settings.commission_bps`  
- Computed server-side at checkout — never trust the client  
- Persisted on `vendor_orders` as `commission_cents` and `vendor_net_cents` (snapshot)

## Checkout rules

- Prices from DB variants only  
- Create inventory reservations before creating Stripe session  
- Persist `payments` row with `payment_intent_id`  
- Return Stripe Checkout URL or client secret  

## Webhooks (source of truth)

Handle at least:

| Event | Action |
|-------|--------|
| `checkout.session.completed` / `payment_intent.succeeded` | Mark order + vendor_orders paid; finalize inventory |
| `payment_intent.payment_failed` | Mark failed; release reservations |
| `charge.refunded` / `refund.created` | Sync refund state |
| `account.updated` | Update vendor Stripe flags |

### Hard rules

1. Verify `Stripe-Signature`  
2. Idempotent on `event.id` (`payment_events` unique)  
3. Do **not** mark paid only because the browser hit `/success`  
4. Use raw request body for verification  

## Multi-vendor payment approaches

| Approach | Pros | Cons |
|----------|------|------|
| **Destination charge to primary + transfers** | Flexible | More code |
| **Separate PaymentIntent per vendor** | Simple accounting | Bad buyer UX |
| **Single PI + transfer group** | Good UX | Must learn Connect patterns |

**Recommendation:** single buyer checkout; application fee; transfers to each vendor’s connected account (or destination charge if one vendor — generalize to multi).

## Refunds

- Admin-initiated from admin panel  
- Stripe refund API  
- Recompute vendor obligations carefully (clawback / negative balance edge — keep MVP to full vendor_order refund before payout)  

## Vendor onboarding

1. `stripe.accounts.create({ type: 'express', ... })`  
2. Save `stripe_account_id`  
3. Account Link → vendor completes KYC  
4. `account.updated` webhook sets `charges_enabled` / `payouts_enabled`  

Vendors without completed onboarding (`charges_enabled`) cannot receive payable orders:

- Add-to-cart and cart reconcile reject / warn on non-payable shops  
- Checkout already blocks with `VENDOR_NOT_PAYABLE`  
- Shop + PDP surfaces a clear “not ready for checkout” message  

Connected readiness in the seller UI requires both `charges_enabled` and `onboarding_complete` (`details_submitted`).

## Test mode demo

- Stripe test keys in `.env`  
- Document test cards in README  
- Stripe CLI: `stripe listen --forward-to localhost:API/webhooks/stripe`  

## What to show in portfolio demo

1. Vendor completes Connect onboarding (test)  
2. Buyer pays  
3. Webhook marks paid  
4. Vendor earnings shows net after commission  
5. Admin metrics show commission  
