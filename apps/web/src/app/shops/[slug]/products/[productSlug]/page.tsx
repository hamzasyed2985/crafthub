import type { Metadata } from 'next';
import Link from 'next/link';
import { Price } from '@crafthub/ui';
import type { ProductDto } from '@/lib/api';
import { AddToCartButton } from '@/components/add-to-cart-button';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function loadShopProducts(slug: string) {
  const res = await fetch(`${API_URL}/api/v1/shops/${slug}`, { next: { revalidate: 30 } });
  if (!res.ok) return null;
  const body = (await res.json()) as {
    data: {
      shop: { displayName: string; slug: string; flatShippingCents: number };
      products: ProductDto[];
    };
  };
  return body.data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const data = await loadShopProducts(slug);
  const product = data?.products.find((p) => p.slug === productSlug);
  if (!product) return { title: 'Product not found' };
  return {
    title: product.title,
    description: product.description.slice(0, 160) || product.title,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const { slug, productSlug } = await params;
  const data = await loadShopProducts(slug);
  const product = data?.products.find((p) => p.slug === productSlug);

  if (!data || !product) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-3xl">Product not found</h1>
        <Link href={`/shops/${slug}`} className="mt-4 inline-block text-accent">
          Back to shop
        </Link>
      </div>
    );
  }

  const variant = product.variants[0];
  const image = product.media[0];

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-6 py-12 md:grid-cols-2">
      <div className="aspect-[4/5] overflow-hidden rounded-lg bg-background-subtle">
        {image ? (
          <img
            src={image.url}
            alt={image.alt || product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-subtle">No image</div>
        )}
      </div>
      <div>
        <Link href={`/shops/${slug}`} className="text-sm text-muted hover:text-foreground">
          {data.shop.displayName}
        </Link>
        <h1 className="mt-2 font-display text-4xl">{product.title}</h1>
        {variant ? (
          <p className="mt-4 text-2xl">
            <Price cents={variant.priceCents} currency={variant.currency} />
          </p>
        ) : null}
        <p className="mt-2 text-sm text-subtle">
          {variant && variant.stockQty > 0 ? `${variant.stockQty} in stock` : 'Sold out'}
          {' · '}
          Flat shipping <Price cents={data.shop.flatShippingCents} />
        </p>
        <p className="mt-6 whitespace-pre-wrap text-muted">{product.description}</p>
        {variant ? (
          <AddToCartButton variantId={variant.id} stockQty={variant.stockQty} />
        ) : null}
      </div>
    </div>
  );
}
