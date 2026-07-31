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

- Homepage: brand-forward hero (full-bleed craft imagery), one CTA (“Explore makers”)
- Explore: filters — category, price, city/region, “ships from”, sort
- Shop page: banner, bio, policies, product grid, reviews summary

### Product detail (PDP)

- Images, title, price, stock, variant selectors
- Vendor chip linking to shop (trust)
- Shipping estimate (flat from shop)
- Add to cart + buy now
- Reviews

### Cart

- Lines grouped **by vendor** (visual clarity for multi-vendor)
- Per-vendor subtotal + shipping
- Platform total
- Warn if reservation/stock changes

### Checkout

1. Auth gate or guest checkout (pick one for MVP; auth-required is simpler)  
2. Shipping address  
3. Review totals (items + shipping + show “includes marketplace fee” only if you want transparency — optional)  
4. Pay with Stripe  
5. Success page + email  

### Account

- Orders with per-vendor shipment status  
- Leave review when `delivered`  

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
