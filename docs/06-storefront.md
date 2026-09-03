# 06 — Storefront (Buyer)

## Goals

Make CraftHub feel like a curated local market: discovery first, trust second, checkout third.

## Route map

| Route | Purpose |
|-------|---------|
| `/` | Hero, featured artisans, trending products |
| `/explore` | Marketplace grid + filters |
| `/shops` | Directory of vendors |
| `/shops/[slug]` | Vendor storefront |
| `/shops/[slug]/products/[productSlug]` | PDP |
| `/cart` | Cart (also cart drawer global) |
| `/checkout` | Address + pay |
| `/checkout/success` | Confirmation (status may still be pending until webhook) |
| `/account` | Profile, addresses |
| `/account/orders` | Order history |
| `/account/orders/[id]` | Order detail / tracking |
| `/login`, `/register` | Auth |
| `/search` | Search results |

## Key UX flows

### Discovery

- Homepage: brand-forward hero; curated **featured** crafts (not the full taxonomy) + “Browse all crafts”
- Explore: search, craft dropdown (active categories), sort, price range, grid density; active filter chips
- Makers (`/shops`): directory by name/city/**craft tags** (not product categories)
- Shop page: banner, bio, craft tags, policies, product grid, reviews summary

### Categories on the storefront

- Explore and home browse by **product category** (platform list).
- Craft tags on a maker profile are free-text identity keywords — they do **not** drive Explore filters.

### Product detail (PDP)

- Images, title, price, stock, variant selectors
- Vendor chip linking to shop (trust)
- Shipping estimate (flat from shop)
- Add to cart — disabled when vendor Stripe Connect is not charge-ready
- Reviews form only when the signed-in buyer is eligible (purchased + shipped/delivered, not already reviewed)

### Cart

- Lines grouped **by vendor** (visual clarity for multi-vendor)
- Per-vendor subtotal + shipping
- Platform total
- Warn if reservation/stock changes
- Warn / block checkout when a vendor group is not Stripe-payable

### Checkout

1. Auth gate or guest checkout (pick one for MVP; auth-required is simpler)  
2. Shipping address  
3. Review totals (items + shipping + show “includes marketplace fee” only if you want transparency — optional)  
4. Pay with Stripe  
5. Success page + email  

Checkout rejects carts that include vendors without `charges_enabled`.

### Account

- Orders with per-vendor shipment status  
- Leave review when item is `shipped` or `delivered` (eligibility API)  

## Empty & error states

- Empty cart, empty search, shop suspended, product archived, payment failed — each with clear next action.

## SEO

- SSR/SSG for shop + product pages  
- Unique titles/descriptions  
- Open Graph images from product media  
- Sitemap for shops/products  

## Performance

- Next/Image for media  
- Skeleton loaders on grids  
- Paginate explore; infinite scroll optional  

## Accessibility

- Keyboard cart drawer  
- Focus rings visible in dark mode  
- Alt text required on upload  

## What not to put on the first viewport

No stat strips, floating promo badges, or dense card dashboards on the marketing home. Brand + headline + one sentence + CTA + hero image.
