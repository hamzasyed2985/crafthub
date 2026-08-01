import type { Metadata } from 'next';
import { ProductCard, Price } from '@crafthub/ui';
import Link from 'next/link';

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
    products: Array<{
      id: string;
      title: string;
      slug: string;
      media: Array<{ url: string; alt: string }>;
      variants: Array<{ priceCents: number; currency: string }>;
      shop: { vendor: { slug: string; displayName: string } };
    }>;
  };
};

async function loadShop(slug: string): Promise<ShopPayload['data'] | null> {
  const res = await fetch(`${API_URL}/api/v1/shops/${slug}`, { next: { revalidate: 30 } });
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
  const data = await loadShop(slug);
  if (!data) return { title: 'Shop not found' };
  return {
    title: data.shop.displayName,
    description: data.shop.bio ?? `${data.shop.displayName} on CraftHub`,
  };
}

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadShop(slug);

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-3xl">Shop not found</h1>
        <Link href="/shops" className="mt-4 inline-block text-accent">
          Browse makers
        </Link>
      </div>
    );
  }

  const { shop, products } = data;

  return (
    <div>
      <div
        className="relative h-48 w-full bg-background-subtle md:h-64"
        style={
          shop.bannerUrl
            ? {
                backgroundImage: `url(${shop.bannerUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      />
      <div className="mx-auto max-w-5xl px-6 pb-16">
        <div className="-mt-10 flex items-end gap-4">
          {shop.logoUrl ? (
            <img
              src={shop.logoUrl}
              alt=""
              className="h-20 w-20 rounded-full border-4 border-background object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-background bg-accent-muted font-display text-2xl text-accent">
              {shop.displayName.slice(0, 1)}
            </div>
          )}
          <div className="pb-1">
            <h1 className="font-display text-3xl md:text-4xl">{shop.displayName}</h1>
            <p className="text-muted">{shop.city}</p>
          </div>
        </div>

        {shop.bio ? <p className="mt-6 max-w-2xl text-muted">{shop.bio}</p> : null}

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-subtle">
          {shop.shipsFromCity ? <span>Ships from {shop.shipsFromCity}</span> : null}
          <span>
            Flat shipping <Price cents={shop.flatShippingCents} />
          </span>
          {shop.shippingPolicy ? (
            <span className="underline decoration-border underline-offset-2">Shipping policy</span>
          ) : null}
          {shop.returnsPolicy ? (
            <span className="underline decoration-border underline-offset-2">Returns</span>
          ) : null}
        </div>

        {shop.craftTags.length > 0 ? (
          <p className="mt-3 text-sm text-subtle">{shop.craftTags.join(' · ')}</p>
        ) : null}

        <h2 className="mt-12 font-display text-2xl">Products</h2>
        {products.length === 0 ? (
          <p className="mt-4 text-muted">No active products yet.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-3">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                href={`/shops/${shop.slug}/products/${p.slug}`}
                title={p.title}
                imageUrl={p.media[0]?.url}
                imageAlt={p.media[0]?.alt}
                priceCents={p.variants[0]?.priceCents ?? 0}
                currency={p.variants[0]?.currency ?? 'USD'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
