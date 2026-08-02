import type { Metadata } from 'next';
import Link from 'next/link';
import { Page } from '@/components/page';
import { ShopProducts } from '@/components/shop-products';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type ShopPayload = {
  data: {
    shop: {
      displayName: string;
      slug: string;
      bio: string | null;
      bannerUrl: string | null;
      logoUrl: string | null;
      city: string | null;
      craftTags: string[];
      shippingPolicy: string | null;
      returnsPolicy: string | null;
      flatShippingCents: number;
      shipsFromCity: string | null;
    };
  };
};

async function loadShopMeta(slug: string): Promise<ShopPayload['data'] | null> {
  const res = await fetch(`${API_URL}/api/v1/shops/${slug}?limit=1`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as ShopPayload;
  return body.data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadShopMeta(slug);
  if (!data) return { title: 'Shop not found' };
  return {
    title: data.shop.displayName,
    description: data.shop.bio ?? `${data.shop.displayName} on CraftHub`,
  };
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const data = await loadShopMeta(slug);

  if (!data) {
    return (
      <Page size="reading" y="lg">
        <h1 className="font-display text-3xl">Shop not found</h1>
        <Link href="/shops" className="mt-4 inline-block text-accent">
          Browse makers
        </Link>
      </Page>
    );
  }

  const { shop } = data;

  return (
    <div className="pb-16">
      <div
        className="h-44 w-full bg-background-subtle md:h-56"
        style={
          shop.bannerUrl
            ? {
                backgroundImage: `url(${shop.bannerUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
        role="img"
        aria-label={shop.bannerUrl ? `${shop.displayName} banner` : undefined}
      />

      <Page size="default" y="none">
        <header className="relative z-0 -mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
          {shop.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shop.logoUrl}
              alt=""
              className="h-24 w-24 shrink-0 rounded-full border-4 border-background bg-elevated object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-background bg-accent-muted font-display text-3xl text-accent shadow-sm">
              {shop.displayName.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0 pb-1 pt-2 sm:pt-0">
            <h1 className="font-display text-3xl leading-tight md:text-4xl">{shop.displayName}</h1>
            {shop.city ? <p className="mt-1 text-muted">{shop.city}</p> : null}
          </div>
        </header>

        {shop.bio ? (
          <p className="mt-6 max-w-2xl text-pretty text-muted">{shop.bio}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-subtle">
          {shop.shipsFromCity ? <span>Ships from {shop.shipsFromCity}</span> : null}
          <span>Flat shipping included on product pages</span>
        </div>

        {shop.craftTags.length > 0 ? (
          <p className="mt-3 text-sm text-subtle">{shop.craftTags.join(' · ')}</p>
        ) : null}

        {(shop.shippingPolicy || shop.returnsPolicy) && (
          <div className="mt-6 space-y-2 border-t border-border pt-6">
            {shop.shippingPolicy ? (
              <details className="group text-sm">
                <summary className="cursor-pointer font-semibold text-foreground">
                  Shipping policy
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-muted">{shop.shippingPolicy}</p>
              </details>
            ) : null}
            {shop.returnsPolicy ? (
              <details className="group text-sm">
                <summary className="cursor-pointer font-semibold text-foreground">
                  Returns policy
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-muted">{shop.returnsPolicy}</p>
              </details>
            ) : null}
          </div>
        )}

        <ShopProducts slug={slug} initialPage={page} />
      </Page>
    </div>
  );
}
