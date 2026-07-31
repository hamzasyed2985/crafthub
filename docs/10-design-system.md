# 10 — Design System

CraftHub’s UI should feel like a **handmade market hall**, not a generic SaaS dashboard. This doc is the source of truth for visual language, tokens, components, and patterns across buyer storefront, vendor dashboard, and admin.

---

## 1. Brand personality

| Trait | How it shows up in UI |
|-------|------------------------|
| Local | City/region cues, maker names ahead of SKUs |
| Handmade | Tactile textures, soft edges, real material photos |
| Trustworthy | Clear prices, visible vendor identity, quiet chrome |
| Warm | Clay accent, linen surfaces — never cold neon |

**Voice (microcopy):** short, human, concrete. Prefer “Ships from your city makers” over “Leverage artisan ecosystems.”

**Anti-goals**

- Purple-on-white / indigo gradient “AI startup” look  
- Warm cream + terracotta + big serif newspaper clone  
- Dark-mode-only with glow borders  
- Pill soup, floating badges on heroes, multi-layer shadows  

---

## 2. Visual direction

### Light mode

- Atmosphere: soft linen / stone wash, subtle paper grain optional (CSS noise at ≤4% opacity, not a stock texture dump)
- Primary surface: off-white linen  
- Elevated surface: pure-ish paper white for cards/tables  
- Text: near-ink charcoal  
- Accent: **fired clay** (warm terracotta-adjacent, but desaturated enough to avoid the cliché cream/terracotta kit)

### Dark mode

- Atmosphere: deep charcoal with a hint of umber (not pure `#000`)  
- Elevated: slightly lifted graphite for drawers/modals  
- Text: soft linen, not harsh white  
- Accent: **same clay hue** (adjust lightness ~5–8% for contrast; do not switch to cyan/purple in dark)  
- Borders: low-contrast warm gray, not bright lines  

### Imagery

- Hero: full-bleed craft photography (hands at a wheel, loom, wood shavings)  
- Product: natural light, neutral backdrop; consistent aspect ratio in grids (`4/5` portrait recommended)  
- Avoid plastic stock “pointing at laptop” photos  

---

## 3. Typography

| Role | Recommended | Fallback stack |
|------|-------------|----------------|
| Display | **Fraunces** (soft optical sizing) | Georgia, serif |
| Body | **Satoshi** or **Source Sans 3** | system-ui, sans-serif |
| Mono (SKU, IDs) | **IBM Plex Mono** | ui-monospace |

**Scale (rem, 1 rem = 16px)**

| Token | Size | Line height | Use |
|-------|------|-------------|-----|
| `display` | 2.5–3rem | 1.1 | Home brand / shop name |
| `h1` | 2rem | 1.2 | Page titles |
| `h2` | 1.5rem | 1.25 | Sections |
| `h3` | 1.25rem | 1.3 | Cards, admin panels |
| `body` | 1rem | 1.55 | Default |
| `body-sm` | 0.875rem | 1.5 | Meta, table secondary |
| `caption` | 0.75rem | 1.4 | Labels, timestamps |

**Rules**

- One display + one body — no third decorative font  
- Shop names may use display; product titles use `h3` / body semibold  
- Never use Inter / Roboto / Arial as the brand face  
- Tracking: slight negative on large display (`-0.02em`); normal on body  

---

## 4. Color tokens

Define **raw palette** then **semantic aliases**. Components only consume semantics.

### Raw palette (example — tune in Figma/code once)

| Name | Light hex (guide) | Role |
|------|-------------------|------|
| `ink-900` | `#1C1917` | Primary text |
| `ink-700` | `#44403C` | Secondary text |
| `ink-500` | `#78716C` | Muted / placeholders |
| `linen-50` | `#F7F3EE` | Page background |
| `linen-100` | `#EFE8DF` | Subtle strips / hover |
| `paper` | `#FCFAF7` | Elevated |
| `clay-600` | `#C45C3A` | Accent |
| `clay-700` | `#A3482E` | Accent hover |
| `clay-100` | `#F3E0D8` | Accent soft bg |
| `moss-600` | `#3F6F4E` | Success |
| `amber-600` | `#B45309` | Warning |
| `rose-600` | `#E11D48` | Danger |
| `line` | `#E7E0D6` | Borders |

Dark counterparts live under `.dark` (ink becomes linen-tinted; linen backgrounds invert to charcoal/umber).

### Semantic tokens (CSS variables)

```css
:root {
  /* surfaces */
  --bg: ...;
  --bg-subtle: ...;
  --bg-elevated: ...;
  --bg-inverse: ...;

  /* text */
  --fg: ...;
  --fg-muted: ...;
  --fg-subtle: ...;
  --fg-on-accent: ...;

  /* chrome */
  --border: ...;
  --border-strong: ...;
  --ring: ...;              /* focus */

  /* brand */
  --accent: ...;
  --accent-hover: ...;
  --accent-muted: ...;

  /* status */
  --success: ...;
  --warning: ...;
  --danger: ...;
  --info: ...;

  /* commerce */
  --price: var(--fg);
  --price-sale: var(--danger);
  --stock-in: var(--success);
  --stock-low: var(--warning);
  --stock-out: var(--fg-muted);
}
```

**Contrast:** body text on `bg` ≥ 4.5:1; large display ≥ 3:1. Recheck clay-on-linen and clay-on-charcoal.

---

## 5. Spacing, radius, elevation

### Spacing scale

`4, 8, 12, 16, 24, 32, 48, 64` → `--space-1` … `--space-8`

| Context | Padding |
|---------|---------|
| Page (mobile) | 16 |
| Page (desktop) | 24–32 |
| Card | 16–24 |
| Compact table cell | 8–12 |
| Section gap | 48–64 |

### Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 4px | Inputs, chips |
| `--radius-md` | 8px | Buttons, small cards |
| `--radius-lg` | 12–16px | Drawers, modals, media |
| `--radius-full` | 999px | Avatars only — not every button |

Prefer **slightly squared** controls (craft/workshop) over bubble UI.

### Elevation

Default: **borders + surface color**, not shadows.  
Optional single soft shadow for modal/drawer only (`0 8px 24px` at low opacity). No stacked shadow recipes.

### Z-index

`base → sticky(10) → dropdown(20) → drawer(30) → modal(40) → toast(50)`

---

## 6. Dark mode implementation

- Library: `next-themes`, `attribute="class"`, default `system`  
- Toggle in site header (buyer) and dashboard topbar (vendor/admin)  
- Persist preference  
- `color-scheme: light/dark` on `html` for native scrollbars/inputs  
- Product images: slight border or background plate so PNGs don’t vanish on dark  
- Charts (admin): use semantic token colors, not hardcoded hex in JS  

---

## 7. Component inventory (`packages/ui`)

### Foundations

| Component | Variants / notes |
|-----------|------------------|
| `Button` | primary, secondary, ghost, danger; sizes sm/md; loading; icon+label |
| `IconButton` | ghost/secondary; always `aria-label` |
| `Input` | text, email, password; error + hint slots |
| `Textarea` | same error pattern |
| `Select` | native or Radix; match input height |
| `Checkbox` / `Radio` / `Switch` | |
| `Label` | paired with controls |

### Feedback & overlay

| Component | Notes |
|-----------|-------|
| `Toast` | success/error; max 3 stacked |
| `Modal` | focus trap, Esc, dense on admin |
| `Drawer` | cart (right); filters (left mobile) |
| `Skeleton` | match ProductCard geometry |
| `EmptyState` | illustration optional; one CTA |
| `Badge` | neutral, accent, success, warning, danger |
| `Banner` | Stripe onboarding incomplete, shop suspended |

### Commerce

| Component | Notes |
|-----------|-------|
| `Price` | formats cents; strike-through support |
| `ProductCard` | image, title, price, vendor chip, stock |
| `VendorChip` | avatar + shop name → shop link |
| `VariantSelector` | pills for size/color; disabled = OOS |
| `QuantityStepper` | min 1, max stock |
| `StockBadge` | In stock / Low / Sold out |
| `OrderStatusPill` | maps domain states to badge tones |
| `CommissionSplit` | vendor earnings: gross / fee / net |

### Vendor & admin

| Component | Notes |
|-----------|-------|
| `PageHeader` | title, description, actions |
| `Stat` | metric + label + optional delta |
| `DataTable` | sort, empty, row actions |
| `FilterBar` | search + status select |
| `SideNav` | dashboard IA |
| `ConfirmDialog` | destructive actions |

**Shared rule:** buyer, vendor, and admin all import from `packages/ui`. Density changes via size props / layout — not a second visual brand.

---

## 8. Layout patterns

### Buyer marketing home

One composition in the first viewport:

1. CraftHub wordmark (hero-level)  
2. One headline  
3. One supporting sentence  
4. One CTA group  
5. Full-bleed hero image  

No stats, schedules, floating promo stickers, or card grids above the fold.

### Marketplace / explore

- Filter rail (desktop) / sheet (mobile)  
- Product grid: 2 col mobile → 3–4 desktop  
- Cards: image-led; minimal chrome  

### Vendor shop

- Full-width banner as visual anchor  
- Avatar + name + city + short bio  
- Policies row (shipping / returns) as text links, not heavy cards  
- Product grid below  

### Checkout

- Single column, calm; progress steps  
- Group cart lines **by vendor**  
- Sticky order summary on desktop  

### Vendor / admin shell

- Left nav (collapsible)  
- Top bar: shop switcher N/A (single shop), theme toggle, account  
- Content max-width ~1200–1400px for tables  

---

## 9. Motion

Ship **three** intentional motions:

1. **Cart drawer** — slide in + dimmed backdrop (150–200ms ease)  
2. **Product grid** — short fade/stagger on first paint (keep ≤50ms/item, max ~6)  
3. **Checkout step** — crossfade between address → review → pay  

Respect `prefers-reduced-motion: reduce` (disable transforms; keep opacity instant).

---

## 10. Iconography & illustration

- Stroke icons (1.5–2px), rounded joins — Lucide or similar  
- Don’t mix filled and outline randomly  
- Empty states: one simple line illustration style, monochrome + clay accent  

---

## 11. Content & state patterns

| State | Treatment |
|-------|-----------|
| Loading | Skeleton matching final layout |
| Empty | Message + primary action |
| Error | Inline field errors; toast for system failures |
| Success | Toast + optional confetti **never** on checkout (too tacky); use calm confirmation |
| Disabled | Lower opacity + `not-allowed`; explain why when useful (e.g. Stripe incomplete) |

**Price display:** always from cents; show currency symbol; vendor net in dashboards labeled “Your earnings.”

---

## 12. Accessibility

- Focus ring: `--ring` 2px offset visible on linen and charcoal  
- Hit targets ≥ 44px on mobile  
- Image `alt` required for products  
- Don’t use color alone for stock/status (pair with text)  
- Cart drawer and modals: focus trap + return focus  

---

## 13. Implementation notes

- Tailwind: map tokens via CSS variables in `globals.css`; use `tailwind.config` theme extension  
- Put primitives in `packages/ui`; app routes compose them  
- Storybook optional but strong for portfolio — at least document components in `/docs` or a `/ui` styleguide page  
- Screenshot light + dark for README  

## 14. Deliverables checklist

- [ ] Token file (light + dark)  
- [ ] Fonts loaded (display + body + mono)  
- [ ] Button / Input / ProductCard / Drawer shipped  
- [ ] Theme toggle wired  
- [ ] Home hero matches layout rules  
- [ ] Admin/vendor use same tokens  
- [ ] Reduced-motion tested  
