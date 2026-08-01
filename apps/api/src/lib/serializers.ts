import type { Prisma } from '@crafthub/db';

type VendorWithShop = Prisma.VendorProfileGetPayload<{
  include: { shop: true; stripeAccount: true };
}>;

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    variants: true;
    media: true;
    category: true;
    shop: { include: { vendor: true } };
  };
}>;

export function serializeVendor(vendor: VendorWithShop) {
  return {
    id: vendor.id,
    displayName: vendor.displayName,
    slug: vendor.slug,
    bio: vendor.bio,
    logoUrl: vendor.logoUrl,
    bannerUrl: vendor.bannerUrl,
    city: vendor.city,
    craftTags: vendor.craftTags,
    status: vendor.status,
    shop: vendor.shop
      ? {
          id: vendor.shop.id,
          shippingPolicy: vendor.shop.shippingPolicy,
          returnsPolicy: vendor.shop.returnsPolicy,
          flatShippingCents: vendor.shop.flatShippingCents,
          shipsFromCity: vendor.shop.shipsFromCity,
        }
      : null,
    stripe: vendor.stripeAccount
      ? {
          onboardingComplete: vendor.stripeAccount.onboardingComplete,
          chargesEnabled: vendor.stripeAccount.chargesEnabled,
          payoutsEnabled: vendor.stripeAccount.payoutsEnabled,
        }
      : null,
    createdAt: vendor.createdAt.toISOString(),
  };
}

export function serializeProduct(product: ProductWithRelations, opts?: { publicOnly?: boolean }) {
  const variants = product.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    priceCents: v.priceCents,
    currency: v.currency,
    stockQty: v.stockQty,
    attributes: (v.attributes ?? {}) as Record<string, string>,
  }));

  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description,
    status: product.status,
    category: product.category
      ? { id: product.category.id, name: product.category.name, slug: product.category.slug }
      : null,
    shop: {
      id: product.shop.id,
      flatShippingCents: product.shop.flatShippingCents,
      shipsFromCity: product.shop.shipsFromCity,
      vendor: {
        id: product.shop.vendor.id,
        displayName: product.shop.vendor.displayName,
        slug: product.shop.vendor.slug,
        city: product.shop.vendor.city,
        logoUrl: product.shop.vendor.logoUrl,
        status: product.shop.vendor.status,
      },
    },
    variants,
    media: product.media
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => ({
        id: m.id,
        url: m.url,
        alt: m.alt,
        sortOrder: m.sortOrder,
      })),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    ...(opts?.publicOnly ? {} : {}),
  };
}

export const productInclude = {
  variants: true,
  media: true,
  category: true,
  shop: { include: { vendor: true } },
} satisfies Prisma.ProductInclude;
