import type { Metadata } from 'next';
import Link from 'next/link';
import { Price } from '@crafthub/ui';
import { Page } from '@/components/page';
import type { ProductDto } from '@/lib/api';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { ProductGallery } from '@/components/product-gallery';
import { ProductReviews } from '@/components/product-reviews';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function loadProduct(shopSlug: string, productSlug: string) {
  const res = await fetch(`${API_URL}/api/v1/shops/${shopSlug}/products/${productSlug}`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as {
    data: {
      shop: { displayName: string; slug: string; flatShippingCents: number };
      product: ProductDto;
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
  const data = await loadProduct(slug, productSlug);
  if (!data) return { title: 'Product not found' };
  return {
    title: data.product.title,
    description: data.product.description.slice(0, 160) || data.product.title,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const { slug, productSlug } = await params;
  const data = await loadProduct(slug, productSlug);

  if (!data) {
    return (
      <Page size="reading" y="lg">
        <h1 className="font-display text-3xl">Product not found</h1>
        <Link href={`/shops/${slug}`} className="mt-4 inline-block text-accent">
          Back to shop
        </Link>
      </Page>
    );
  }

  const { product } = data;
  const variant = product.variants[0];

  return (
    <Page size="default">
      <div className="grid gap-10 md:grid-cols-2 md:items-start">
        <ProductGallery media={product.media} title={product.title} />
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
      <div className="mt-14 border-t border-border pt-10">
        <ProductReviews productId={product.id} canReview />
      </div>
    </Page>
  );
}
