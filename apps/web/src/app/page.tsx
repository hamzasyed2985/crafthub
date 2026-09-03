import Link from 'next/link';
import { Button, ProductCard } from '@crafthub/ui';
import { HeroScrollHint } from '@/components/hero-scroll-hint';
import { Page } from '@/components/page';
import { getApiBaseUrl } from '@/lib/api-base-url';

const API_URL = getApiBaseUrl();

type ProductRow = {
  id: string;
  title: string;
  slug: string;
  media: Array<{ url: string; alt: string }>;
  variants: Array<{ priceCents: number; currency: string }>;
  shop: {
    vendor: { displayName: string; slug: string };
  };
};

type ShopRow = {
  id: string;
  displayName: string;
  slug: string;
  city: string | null;
  bio: string | null;
  logoUrl: string | null;
};

type CategoryRow = { id: string; name: string; slug: string; featured?: boolean };

async function loadHome() {
  try {
    const [productsRes, shopsRes, featuredRes, allCatsRes] = await Promise.all([
      fetch(`${API_URL}/api/v1/products?limit=8&sort=newest`, { next: { revalidate: 30 } }),
      fetch(`${API_URL}/api/v1/shops?limit=6`, { next: { revalidate: 30 } }),
      fetch(`${API_URL}/api/v1/categories?featured=1`, { next: { revalidate: 60 } }),
      fetch(`${API_URL}/api/v1/categories`, { next: { revalidate: 60 } }),
    ]);
    const productsJson = productsRes.ok
      ? ((await productsRes.json()) as { data: ProductRow[] })
      : { data: [] };
    const shopsJson = shopsRes.ok ? ((await shopsRes.json()) as { data: ShopRow[] }) : { data: [] };
    const featuredJson = featuredRes.ok
      ? ((await featuredRes.json()) as { data: CategoryRow[] })
      : { data: [] };
    const allCatsJson = allCatsRes.ok
      ? ((await allCatsRes.json()) as { data: CategoryRow[] })
      : { data: [] };
    const featured = featuredJson.data ?? [];
    const all = allCatsJson.data ?? [];
    return {
      products: productsJson.data ?? [],
      shops: shopsJson.data ?? [],
      categories: featured.length > 0 ? featured.slice(0, 8) : all.slice(0, 8),
      hasMoreCrafts: all.length > (featured.length > 0 ? featured.length : 8),
    };
  } catch {
    return { products: [], shops: [], categories: [], hasMoreCrafts: false };
  }
}

export default async function HomePage() {
  const { products, shops, categories, hasMoreCrafts } = await loadHome();

  return (
    <>
      <section className="relative grid min-h-[calc(100vh-64px)] place-items-center overflow-hidden px-6 pb-24 pt-8">
        <div aria-hidden className="hero-atmosphere absolute inset-0 z-0" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-32 bg-gradient-to-t from-background via-background/80 to-transparent"
        />

        <div className="relative z-[1] flex max-w-3xl flex-col items-center gap-5 text-center">
          <p className="m-0 font-display text-[clamp(2.75rem,8vw,4.5rem)] leading-[1.05] tracking-[-0.03em] text-foreground">
            CraftHub
          </p>
          <h1 className="m-0 font-display text-[clamp(1.5rem,3.5vw,2rem)] font-medium leading-tight text-muted">
            Handmade finds from makers near you
          </h1>
          <p className="m-0 max-w-[34rem] text-[1.05rem] text-subtle">
            A marketplace for local artisans — pottery, jewelry, woodwork, and more — with shops that
            keep their craft front and center.
          </p>
          <div className="mt-2 flex gap-3">
            <Link href="/explore">
              <Button>Explore makers</Button>
            </Link>
            <Link href="/register">
              <Button variant="secondary">Sell on CraftHub</Button>
            </Link>
          </div>
        </div>

        <HeroScrollHint />
      </section>

      <div id="home-content" className="scroll-mt-16" aria-hidden />

      {products.length > 0 ? (
        <section className="border-t border-border bg-elevated/40 py-14">
          <Page size="wide" y="none">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl">New in the hall</h2>
                <p className="mt-1 text-sm text-muted">Fresh pieces from approved makers.</p>
              </div>
              <Link href="/explore">
                <Button variant="secondary" size="sm">
                  See all products →
                </Button>
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => {
                const variant = p.variants[0];
                return (
                  <ProductCard
                    key={p.id}
                    href={`/shops/${p.shop.vendor.slug}/products/${p.slug}`}
                    title={p.title}
                    imageUrl={p.media[0]?.url}
                    imageAlt={p.media[0]?.alt}
                    priceCents={variant?.priceCents ?? 0}
                    currency={variant?.currency ?? 'USD'}
                    vendorName={p.shop.vendor.displayName}
                    vendorHref={`/shops/${p.shop.vendor.slug}`}
                  />
                );
              })}
            </div>
          </Page>
        </section>
      ) : null}

      {shops.length > 0 ? (
        <section className="border-t border-border py-14">
          <Page size="wide" y="none">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl">Makers to meet</h2>
                <p className="mt-1 text-sm text-muted">Independent shops with their own craft stories.</p>
              </div>
              <Link href="/shops">
                <Button variant="secondary" size="sm">
                  Browse all makers →
                </Button>
              </Link>
            </div>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {shops.map((s) => (
                <li key={s.id}>
                  <Link href={`/shops/${s.slug}`} className="flex gap-4 hover:opacity-90">
                    {s.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.logoUrl}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-muted font-display text-xl text-accent">
                        {s.displayName.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-display text-lg">{s.displayName}</p>
                      {s.city ? <p className="text-sm text-muted">{s.city}</p> : null}
                      {s.bio ? (
                        <p className="mt-1 line-clamp-2 text-sm text-subtle">{s.bio}</p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Page>
        </section>
      ) : null}

      {categories.length > 0 ? (
        <section className="border-t border-border bg-elevated/40 py-14">
          <Page size="wide" y="none">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl">Shop by craft</h2>
                <p className="mt-1 text-sm text-muted">A curated set of making traditions.</p>
              </div>
              {hasMoreCrafts ? (
                <Link href="/explore">
                  <Button variant="secondary" size="sm">
                    Browse all crafts →
                  </Button>
                </Link>
              ) : null}
            </div>
            <ul className="mt-8 flex flex-wrap gap-3">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/explore?category=${encodeURIComponent(c.slug)}`}
                    className="inline-block rounded-md border border-border bg-elevated px-4 py-2 text-sm hover:border-accent"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Page>
        </section>
      ) : null}

      <section className="border-t border-border py-14">
        <Page size="wide" y="none">
          <h2 className="font-display text-2xl">How CraftHub works</h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            <li>
              <p className="text-sm font-semibold text-accent">1 · Browse</p>
              <p className="mt-2 text-sm text-muted">
                Explore handmade goods and visit maker shops — prices and stock come from the catalog.
              </p>
            </li>
            <li>
              <p className="text-sm font-semibold text-accent">2 · Checkout</p>
              <p className="mt-2 text-sm text-muted">
                One cart across shops; you pay once and each maker is paid for their slice.
              </p>
            </li>
            <li>
              <p className="text-sm font-semibold text-accent">3 · Ships from makers</p>
              <p className="mt-2 text-sm text-muted">
                Artisans fulfill their own orders and you can track each shipment.
              </p>
            </li>
          </ol>
        </Page>
      </section>
    </>
  );
}
