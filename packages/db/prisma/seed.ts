import { PrismaClient, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();

function computeCommission(subtotalCents: number, commissionBps: number): number {
  return Math.floor((subtotalCents * commissionBps) / 10_000);
}

async function hashPassword(password: string): Promise<string> {
  const bcryptMod = await import('bcryptjs');
  const bcrypt = bcryptMod.default ?? bcryptMod;
  return bcrypt.hash(password, 12);
}

const CATEGORIES = [
  { name: 'Pottery', slug: 'pottery' },
  { name: 'Jewelry', slug: 'jewelry' },
  { name: 'Woodwork', slug: 'woodwork' },
  { name: 'Textiles', slug: 'textiles' },
  { name: 'Food crafts', slug: 'food-crafts' },
];

const IMG = {
  potteryBanner: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1600&q=80',
  potteryLogo: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=200&q=80',
  mug1: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80',
  mug2: 'https://images.unsplash.com/photo-1493106819501-66d381c466f1?w=800&q=80',
  bowl1: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&q=80',
  woodBanner: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=1600&q=80',
  woodLogo: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=200&q=80',
  board1: 'https://images.unsplash.com/photo-1606914469633-bd39206ea739?w=800&q=80',
  board2: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
  spoon1:
    'https://images.pexels.com/photos/6944172/pexels-photo-6944172.jpeg?auto=compress&cs=tinysrgb&w=800',
  spoon2:
    'https://images.pexels.com/photos/4397920/pexels-photo-4397920.jpeg?auto=compress&cs=tinysrgb&w=800',
  jewelBanner: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1600&q=80',
  jewelLogo: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200&q=80',
  ring1: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
  ring2: 'https://images.unsplash.com/photo-1603561596112-0a132b757442?w=800&q=80',
  necklace1: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
  earrings1:
    'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&w=800',
  textileBanner: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1600&q=80',
  textileLogo: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=200&q=80',
  scarf1: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&q=80',
  scarf2:
    'https://images.pexels.com/photos/6969831/pexels-photo-6969831.jpeg?auto=compress&cs=tinysrgb&w=800',
  throw1:
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80',
  throw2:
    'https://images.pexels.com/photos/6585764/pexels-photo-6585764.jpeg?auto=compress&cs=tinysrgb&w=800',
  cushion1:
    'https://images.pexels.com/photos/1090638/pexels-photo-1090638.jpeg?auto=compress&cs=tinysrgb&w=800',
  foodBanner:
    'https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=800',
  foodLogo:
    'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=200',
  honey1:
    'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=800',
  honey2:
    'https://images.pexels.com/photos/5591663/pexels-photo-5591663.jpeg?auto=compress&cs=tinysrgb&w=800',
  jam1:
    'https://images.pexels.com/photos/4198024/pexels-photo-4198024.jpeg?auto=compress&cs=tinysrgb&w=800',
  jam2:
    'https://images.pexels.com/photos/4198019/pexels-photo-4198019.jpeg?auto=compress&cs=tinysrgb&w=800',
  plate1:
    'https://images.pexels.com/photos/896923/pexels-photo-896923.jpeg?auto=compress&cs=tinysrgb&w=800',
  vase1:
    'https://images.pexels.com/photos/1123401/pexels-photo-1123401.jpeg?auto=compress&cs=tinysrgb&w=800',
  knife1:
    'https://images.pexels.com/photos/4226896/pexels-photo-4226896.jpeg?auto=compress&cs=tinysrgb&w=800',
};

type MediaSeed = { url: string; alt: string; storageKey: string; sortOrder: number };

async function purgeTestArtifacts() {
  const junkVendors = await prisma.vendorProfile.findMany({
    where: {
      OR: [
        { slug: { startsWith: 'approve-' } },
        { slug: { startsWith: 'journey-' } },
        { slug: { startsWith: 'nos-' } },
        { slug: { startsWith: 'e2e-' } },
        { slug: { startsWith: 'shop-' } },
        { slug: { startsWith: 'pending-' } },
        { slug: { startsWith: 'p6-approve-' } },
        { slug: { startsWith: 'my-shop-' } },
        { displayName: { startsWith: 'E2E Shop' } },
        { displayName: { startsWith: 'No Stripe' } },
        { displayName: { startsWith: 'Journey Studio' } },
        { user: { email: { endsWith: '@crafthub.test' } } },
      ],
    },
    select: { id: true, userId: true },
  });

  const junkBuyers = await prisma.user.findMany({
    where: { email: { endsWith: '@crafthub.test' } },
    select: { id: true },
  });

  const junkVendorIds = junkVendors.map((v) => v.id);
  const junkUserIds = [...new Set([...junkVendors.map((v) => v.userId), ...junkBuyers.map((u) => u.id)])];

  // E2E products left on seeded shops (bowls, filter fixtures, etc.)
  const junkProducts = await prisma.product.findMany({
    where: {
      OR: [
        { title: { startsWith: 'E2E' } },
        { title: { startsWith: 'Updated E2E' } },
        { title: { startsWith: 'Pottery Filter' } },
        { title: { startsWith: 'Unpayable' } },
        { title: { startsWith: 'Journey Mug' } },
        { slug: { startsWith: 'bowl-' } },
        { slug: { startsWith: 'prod-' } },
        { slug: { startsWith: 'dup-' } },
        { slug: { startsWith: 'cat-' } },
        { slug: { startsWith: 'other-ops-' } },
        { slug: { startsWith: 'e2e-' } },
        { slug: { startsWith: 'journey-' } },
      ],
    },
    select: { id: true },
  });
  // Also purge any products belonging to junk vendors
  const junkVendorProductIds =
    junkVendorIds.length > 0
      ? (
          await prisma.product.findMany({
            where: { shop: { vendorId: { in: junkVendorIds } } },
            select: { id: true },
          })
        ).map((p) => p.id)
      : [];
  const junkProductIds = [...new Set([...junkProducts.map((p) => p.id), ...junkVendorProductIds])];

  if (junkVendorIds.length === 0 && junkUserIds.length === 0 && junkProductIds.length === 0) {
    return;
  }

  if (junkProductIds.length) {
    await prisma.productEmbedding.deleteMany({ where: { productId: { in: junkProductIds } } });
  }

  const vendorOrderRows = junkVendorIds.length
    ? await prisma.vendorOrder.findMany({
        where: { vendorId: { in: junkVendorIds } },
        select: { orderId: true },
      })
    : [];
  const buyerOrders = junkUserIds.length
    ? await prisma.order.findMany({
        where: { buyerId: { in: junkUserIds } },
        select: { id: true },
      })
    : [];
  const orderIds = [...new Set([...vendorOrderRows.map((r) => r.orderId), ...buyerOrders.map((o) => o.id)])];

  if (orderIds.length) {
    await prisma.inventoryReservation.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  }
  if (junkVendorIds.length) {
    await prisma.vendorLedgerEntry.deleteMany({ where: { vendorId: { in: junkVendorIds } } });
    await prisma.transfer.deleteMany({
      where: { vendorOrder: { vendorId: { in: junkVendorIds } } },
    });
    await prisma.orderItem.deleteMany({
      where: { vendorOrder: { vendorId: { in: junkVendorIds } } },
    });
    await prisma.vendorOrder.deleteMany({ where: { vendorId: { in: junkVendorIds } } });
  }
  if (orderIds.length) {
    await prisma.vendorOrder.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }

  if (junkProductIds.length) {
    await prisma.review.deleteMany({ where: { productId: { in: junkProductIds } } });
    await prisma.media.deleteMany({ where: { productId: { in: junkProductIds } } });
    const variants = await prisma.productVariant.findMany({
      where: { productId: { in: junkProductIds } },
      select: { id: true },
    });
    const variantIds = variants.map((v) => v.id);
    if (variantIds.length) {
      await prisma.cartItem.deleteMany({ where: { variantId: { in: variantIds } } });
      await prisma.inventoryReservation.deleteMany({ where: { variantId: { in: variantIds } } });
    }
    // Prefer hard delete; archive if order history blocks (FK Restrict elsewhere)
    try {
      await prisma.productVariant.deleteMany({ where: { productId: { in: junkProductIds } } });
      await prisma.product.deleteMany({ where: { id: { in: junkProductIds } } });
    } catch {
      await prisma.product.updateMany({
        where: { id: { in: junkProductIds } },
        data: { status: 'archived' },
      });
    }
  }

  // Reviews / carts for junk users
  if (junkUserIds.length) {
    await prisma.review.deleteMany({ where: { userId: { in: junkUserIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: junkUserIds } } });
    await prisma.cart.deleteMany({ where: { userId: { in: junkUserIds } } });
    await prisma.address.deleteMany({ where: { userId: { in: junkUserIds } } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: junkUserIds } } });
  }

  if (junkVendorIds.length) {
    await prisma.vendorProfile.deleteMany({ where: { id: { in: junkVendorIds } } });
  }
  if (junkUserIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: junkUserIds } } });
  }

  console.log(
    `  Purged ${junkVendorIds.length} test vendors / ${junkUserIds.length} test users / ${junkProductIds.length} test products`,
  );
}

async function upsertProduct(input: {
  shopId: string;
  categoryId: string;
  title: string;
  slug: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  sku: string;
  priceCents: number;
  stockQty: number;
  attributes?: Prisma.InputJsonValue;
  media: MediaSeed[];
}) {
  const existing = await prisma.product.findUnique({
    where: { shopId_slug: { shopId: input.shopId, slug: input.slug } },
    include: { variants: true, media: true },
  });

  if (!existing) {
    return prisma.product.create({
      data: {
        shopId: input.shopId,
        categoryId: input.categoryId,
        title: input.title,
        slug: input.slug,
        description: input.description,
        status: input.status,
        variants: {
          create: [
            {
              sku: input.sku,
              priceCents: input.priceCents,
              currency: 'USD',
              stockQty: input.stockQty,
              attributes: input.attributes ?? {},
            },
          ],
        },
        media: {
          create: input.media.map((m) => ({
            url: m.url,
            storageKey: m.storageKey,
            alt: m.alt,
            sortOrder: m.sortOrder,
          })),
        },
      },
      include: { variants: true, media: true },
    });
  }

  await prisma.product.update({
    where: { id: existing.id },
    data: {
      title: input.title,
      description: input.description,
      status: input.status,
      categoryId: input.categoryId,
    },
  });
  await prisma.productVariant.updateMany({
    where: { productId: existing.id },
    data: { priceCents: input.priceCents, stockQty: input.stockQty, sku: input.sku },
  });

  for (const m of input.media) {
    const row = existing.media.find((x) => x.storageKey === m.storageKey);
    if (row) {
      await prisma.media.update({
        where: { id: row.id },
        data: { url: m.url, alt: m.alt, sortOrder: m.sortOrder },
      });
    } else {
      await prisma.media.create({
        data: {
          productId: existing.id,
          url: m.url,
          storageKey: m.storageKey,
          alt: m.alt,
          sortOrder: m.sortOrder,
        },
      });
    }
  }

  return prisma.product.findUniqueOrThrow({
    where: { id: existing.id },
    include: { variants: true, media: true },
  });
}

async function ensureSeedOrder(input: {
  idempotencyKey: string;
  buyerId: string;
  status: 'pending_payment' | 'paid' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  vendorOrderStatus:
    | 'awaiting_payment'
    | 'paid'
    | 'fulfilling'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'refunded';
  vendorId: string;
  shippingCents: number;
  commissionBps: number;
  paymentStatus?: 'pending' | 'succeeded' | 'refunded' | 'cancelled';
  transferStatus?: 'pending' | 'paid' | 'failed' | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  items: Array<{
    productId: string;
    variantId: string;
    title: string;
    productSlug: string;
    sku: string | null;
    unitPriceCents: number;
    quantity: number;
  }>;
  ledgerDebtCents?: number;
  daysAgo?: number;
}) {
  const existing = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return existing;

  const itemsSubtotal = input.items.reduce((n, i) => n + i.unitPriceCents * i.quantity, 0);
  const commissionCents = computeCommission(itemsSubtotal, input.commissionBps);
  const vendorNetCents = itemsSubtotal + input.shippingCents - commissionCents;
  const createdAt = new Date(Date.now() - (input.daysAgo ?? 3) * 24 * 60 * 60 * 1000);

  const order = await prisma.order.create({
    data: {
      buyerId: input.buyerId,
      status: input.status,
      currency: 'USD',
      itemsSubtotalCents: itemsSubtotal,
      shippingTotalCents: input.shippingCents,
      totalCents: itemsSubtotal + input.shippingCents,
      commissionTotalCents: commissionCents,
      idempotencyKey: input.idempotencyKey,
      shipName: 'Sara Khan',
      shipLine1: '12 Clifton Block 5',
      shipCity: 'Karachi',
      shipRegion: 'Sindh',
      shipPostalCode: '75600',
      shipCountry: 'PK',
      createdAt,
      payment: {
        create: {
          status: input.paymentStatus ?? (input.status === 'pending_payment' ? 'pending' : 'succeeded'),
          amountCents: itemsSubtotal + input.shippingCents,
          applicationFeeCents: commissionCents,
          currency: 'USD',
          checkoutSessionId: `cs_seed_${input.idempotencyKey}`,
          paymentIntentId: `pi_seed_${input.idempotencyKey}`,
        },
      },
      vendorOrders: {
        create: [
          {
            vendorId: input.vendorId,
            status: input.vendorOrderStatus,
            itemsSubtotalCents: itemsSubtotal,
            shippingCents: input.shippingCents,
            commissionBps: input.commissionBps,
            commissionCents,
            vendorNetCents,
            trackingNumber: input.trackingNumber ?? null,
            carrier: input.carrier ?? null,
            fulfillingAt:
              input.vendorOrderStatus === 'fulfilling' ||
              input.vendorOrderStatus === 'shipped' ||
              input.vendorOrderStatus === 'delivered'
                ? createdAt
                : null,
            shippedAt:
              input.vendorOrderStatus === 'shipped' || input.vendorOrderStatus === 'delivered'
                ? new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000)
                : null,
            createdAt,
            items: {
              create: input.items.map((i) => ({
                productId: i.productId,
                variantId: i.variantId,
                title: i.title,
                productSlug: i.productSlug,
                sku: i.sku,
                unitPriceCents: i.unitPriceCents,
                quantity: i.quantity,
                lineTotalCents: i.unitPriceCents * i.quantity,
                attributes: {},
              })),
            },
            ...(input.transferStatus
              ? {
                  transfer: {
                    create: {
                      amountCents: vendorNetCents,
                      currency: 'USD',
                      status: input.transferStatus,
                      stripeTransferId:
                        input.transferStatus === 'paid'
                          ? `tr_seed_${input.idempotencyKey}`
                          : null,
                    },
                  },
                }
              : {}),
          },
        ],
      },
    },
  });

  if (input.ledgerDebtCents && input.ledgerDebtCents > 0) {
    const vo = await prisma.vendorOrder.findFirstOrThrow({ where: { orderId: order.id } });
    await prisma.vendorLedgerEntry.create({
      data: {
        vendorId: input.vendorId,
        kind: 'refund_debt',
        amountCents: input.ledgerDebtCents,
        currency: 'USD',
        orderId: order.id,
        vendorOrderId: vo.id,
        note: 'Seed: post-payout refund debt',
      },
    });
    await prisma.vendorProfile.update({
      where: { id: input.vendorId },
      data: { ledgerReviewRequired: input.ledgerDebtCents >= 10000 },
    });
  }

  return order;
}

async function main() {
  console.log('Seeding CraftHub…');

  await purgeTestArtifacts();

  await prisma.platformSettings.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: { commissionBps: 1000, currency: 'USD', debtReviewThresholdCents: 10000 },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      commissionBps: 1000,
      currency: 'USD',
      debtReviewThresholdCents: 10000,
    },
  });

  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: cat,
    });
  }

  const cats = Object.fromEntries(
    (await prisma.category.findMany()).map((c) => [c.slug, c]),
  ) as Record<string, { id: string; slug: string }>;

  const adminHash = await hashPassword('Admin123!');
  const vendorHash = await hashPassword('Vendor123!');
  const buyerHash = await hashPassword('Buyer123!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@crafthub.local' },
    update: { role: 'admin', passwordHash: adminHash, name: 'CraftHub Admin' },
    create: {
      email: 'admin@crafthub.local',
      passwordHash: adminHash,
      name: 'CraftHub Admin',
      role: 'admin',
    },
  });

  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@crafthub.local' },
    update: { role: 'customer', passwordHash: buyerHash, name: 'Sara Khan' },
    create: {
      email: 'buyer@crafthub.local',
      passwordHash: buyerHash,
      name: 'Sara Khan',
      role: 'customer',
    },
  });

  const buyer2 = await prisma.user.upsert({
    where: { email: 'buyer2@crafthub.local' },
    update: { role: 'customer', passwordHash: buyerHash, name: 'Ali Raza' },
    create: {
      email: 'buyer2@crafthub.local',
      passwordHash: buyerHash,
      name: 'Ali Raza',
      role: 'customer',
    },
  });

  async function upsertVendor(opts: {
    email: string;
    name: string;
    displayName: string;
    slug: string;
    bio: string;
    city: string;
    craftTags: string[];
    status: 'pending' | 'approved' | 'suspended';
    bannerUrl: string;
    logoUrl: string;
    shipsFromCity: string;
    flatShippingCents: number;
    shippingPolicy: string;
    returnsPolicy: string;
    stripeReady?: boolean;
  }) {
    const user = await prisma.user.upsert({
      where: { email: opts.email },
      update: { role: 'vendor', passwordHash: vendorHash, name: opts.name },
      create: {
        email: opts.email,
        passwordHash: vendorHash,
        name: opts.name,
        role: 'vendor',
      },
    });

    const vendor = await prisma.vendorProfile.upsert({
      where: { userId: user.id },
      update: {
        status: opts.status,
        displayName: opts.displayName,
        slug: opts.slug,
        bio: opts.bio,
        city: opts.city,
        craftTags: opts.craftTags,
        bannerUrl: opts.bannerUrl,
        logoUrl: opts.logoUrl,
      },
      create: {
        userId: user.id,
        displayName: opts.displayName,
        slug: opts.slug,
        bio: opts.bio,
        city: opts.city,
        craftTags: opts.craftTags,
        status: opts.status,
        bannerUrl: opts.bannerUrl,
        logoUrl: opts.logoUrl,
        shop: {
          create: {
            shipsFromCity: opts.shipsFromCity,
            flatShippingCents: opts.flatShippingCents,
            shippingPolicy: opts.shippingPolicy,
            returnsPolicy: opts.returnsPolicy,
          },
        },
        stripeAccount: {
          create: {
            stripeAccountId: opts.stripeReady ? `acct_seed_${opts.slug}` : null,
            onboardingComplete: Boolean(opts.stripeReady),
            chargesEnabled: Boolean(opts.stripeReady),
            payoutsEnabled: Boolean(opts.stripeReady),
          },
        },
      },
      include: { shop: true, stripeAccount: true },
    });

    if (!vendor.shop) {
      await prisma.shop.create({
        data: {
          vendorId: vendor.id,
          shipsFromCity: opts.shipsFromCity,
          flatShippingCents: opts.flatShippingCents,
          shippingPolicy: opts.shippingPolicy,
          returnsPolicy: opts.returnsPolicy,
        },
      });
    } else {
      await prisma.shop.update({
        where: { id: vendor.shop.id },
        data: {
          shipsFromCity: opts.shipsFromCity,
          flatShippingCents: opts.flatShippingCents,
          shippingPolicy: opts.shippingPolicy,
          returnsPolicy: opts.returnsPolicy,
        },
      });
    }

    if (!vendor.stripeAccount) {
      await prisma.stripeAccount.create({
        data: {
          vendorId: vendor.id,
          stripeAccountId: opts.stripeReady ? `acct_seed_${opts.slug}` : null,
          onboardingComplete: Boolean(opts.stripeReady),
          chargesEnabled: Boolean(opts.stripeReady),
          payoutsEnabled: Boolean(opts.stripeReady),
        },
      });
    } else if (opts.stripeReady) {
      await prisma.stripeAccount.update({
        where: { vendorId: vendor.id },
        data: {
          stripeAccountId: `acct_seed_${opts.slug}`,
          onboardingComplete: true,
          chargesEnabled: true,
          payoutsEnabled: true,
        },
      });
    }

    return prisma.vendorProfile.findUniqueOrThrow({
      where: { id: vendor.id },
      include: { shop: true },
    });
  }

  const pottery = await upsertVendor({
    email: 'pottery@crafthub.local',
    name: 'Amina Clay',
    displayName: 'Clay & Ember Studio',
    slug: 'clay-ember',
    bio: 'Small-batch pottery from Karachi — mugs, bowls, and wheel-thrown pieces fired in a home studio.',
    city: 'Karachi',
    craftTags: ['pottery', 'mugs', 'handmade'],
    status: 'approved',
    bannerUrl: IMG.potteryBanner,
    logoUrl: IMG.potteryLogo,
    shipsFromCity: 'Karachi',
    flatShippingCents: 400,
    shippingPolicy: 'Ships within 3–5 business days via local courier. Fragile items double-boxed.',
    returnsPolicy: 'Contact within 7 days for damaged items. Custom glazes are final sale.',
    stripeReady: true,
  });

  const wood = await upsertVendor({
    email: 'wood@crafthub.local',
    name: 'Omar Timber',
    displayName: 'Grain & Groove',
    slug: 'grain-groove',
    bio: 'Hand-cut boards and kitchen tools from reclaimed hardwood in Lahore.',
    city: 'Lahore',
    craftTags: ['woodwork', 'boards', 'kitchen'],
    status: 'approved',
    bannerUrl: IMG.woodBanner,
    logoUrl: IMG.woodLogo,
    shipsFromCity: 'Lahore',
    flatShippingCents: 600,
    shippingPolicy: 'Ships in 5–7 days, carefully wrapped in kraft and tissue.',
    returnsPolicy: 'No returns on custom cuts; damaged items within 5 days.',
    stripeReady: true,
  });

  const jewelry = await upsertVendor({
    email: 'jewelry@crafthub.local',
    name: 'Noor Silver',
    displayName: 'Noor Atelier',
    slug: 'noor-atelier',
    bio: 'Sterling silver jewelry with locally cut stones — made to order in Islamabad.',
    city: 'Islamabad',
    craftTags: ['jewelry', 'silver', 'rings'],
    status: 'approved',
    bannerUrl: IMG.jewelBanner,
    logoUrl: IMG.jewelLogo,
    shipsFromCity: 'Islamabad',
    flatShippingCents: 350,
    shippingPolicy: 'Ships in 4–6 days in a soft pouch and rigid mailer.',
    returnsPolicy: 'Resize once within 14 days. Pierced pieces are final sale.',
    stripeReady: true,
  });

  const textiles = await upsertVendor({
    email: 'textiles@crafthub.local',
    name: 'Farah Loom',
    displayName: 'Loom & Light',
    slug: 'loom-light',
    bio: 'Handwoven scarves and home textiles using natural dyes from Multan.',
    city: 'Multan',
    craftTags: ['textiles', 'scarves', 'weaving'],
    status: 'approved',
    bannerUrl: IMG.textileBanner,
    logoUrl: IMG.textileLogo,
    shipsFromCity: 'Multan',
    flatShippingCents: 450,
    shippingPolicy: 'Ships folded with tissue in 3–5 days.',
    returnsPolicy: 'Unworn pieces within 10 days with tags attached.',
    stripeReady: true,
  });

  await upsertVendor({
    email: 'pending@crafthub.local',
    name: 'Zain Pending',
    displayName: 'Saffron Candle Co.',
    slug: 'saffron-candle',
    bio: 'Soy candles with regional spice notes. Awaiting admin approval.',
    city: 'Peshawar',
    craftTags: ['candles', 'home'],
    status: 'pending',
    bannerUrl: IMG.foodBanner,
    logoUrl: IMG.foodLogo,
    shipsFromCity: 'Peshawar',
    flatShippingCents: 500,
    shippingPolicy: 'Ships after approval.',
    returnsPolicy: 'Unused within 7 days.',
    stripeReady: false,
  });

  await upsertVendor({
    email: 'suspended@crafthub.local',
    name: 'Suspended Maker',
    displayName: 'Harbor Resale (suspended)',
    slug: 'harbor-resale',
    bio: 'Account suspended for marketplace policy review.',
    city: 'Karachi',
    craftTags: ['misc'],
    status: 'suspended',
    bannerUrl: IMG.woodBanner,
    logoUrl: IMG.woodLogo,
    shipsFromCity: 'Karachi',
    flatShippingCents: 500,
    shippingPolicy: 'N/A',
    returnsPolicy: 'N/A',
    stripeReady: false,
  });

  const food = await upsertVendor({
    email: 'food@crafthub.local',
    name: 'Hina Orchard',
    displayName: 'Orchard Pantry',
    slug: 'orchard-pantry',
    bio: 'Small-batch honey and preserves from foothill orchards near Murree.',
    city: 'Murree',
    craftTags: ['food', 'honey', 'preserves'],
    status: 'approved',
    bannerUrl: IMG.foodBanner,
    logoUrl: IMG.foodLogo,
    shipsFromCity: 'Murree',
    flatShippingCents: 550,
    shippingPolicy: 'Ships cool-packed within 2–4 days. Avoid extreme heat.',
    returnsPolicy: 'Damaged jars only within 5 days with photo.',
    stripeReady: true,
  });

  if (!pottery.shop || !wood.shop || !jewelry.shop || !textiles.shop || !food.shop) {
    throw new Error('Shop missing after vendor upsert');
  }

  const mug = await upsertProduct({
    shopId: pottery.shop.id,
    categoryId: cats.pottery.id,
    title: 'Ember Mug',
    slug: 'ember-mug',
    description:
      'Wheel-thrown stoneware mug with a warm ember glaze. Holds about 300ml. Food-safe and dishwasher-friendly on the top rack.',
    status: 'active',
    sku: 'MUG-EMBER-01',
    priceCents: 2800,
    stockQty: 42,
    attributes: { size: 'standard' },
    media: [
      { url: IMG.mug1, alt: 'Ember mug front view', storageKey: 'seed/ember-mug-1', sortOrder: 0 },
      { url: IMG.mug2, alt: 'Ember mug on a table', storageKey: 'seed/ember-mug-2', sortOrder: 1 },
    ],
  });

  const bowl = await upsertProduct({
    shopId: pottery.shop.id,
    categoryId: cats.pottery.id,
    title: 'River Bowl',
    slug: 'river-bowl',
    description: 'Hand-thrown serving bowl with a soft grey-blue glaze. About 18cm across.',
    status: 'active',
    sku: 'BOWL-RIV-01',
    priceCents: 3600,
    stockQty: 18,
    media: [
      { url: IMG.bowl1, alt: 'Ceramic serving bowl', storageKey: 'seed/river-bowl-1', sortOrder: 0 },
    ],
  });

  await upsertProduct({
    shopId: pottery.shop.id,
    categoryId: cats.pottery.id,
    title: 'Speckled Dinner Plate',
    slug: 'speckled-plate',
    description: 'Stoneware dinner plate with speckled glaze. About 26cm. Food-safe.',
    status: 'active',
    sku: 'PLATE-SPK-01',
    priceCents: 2200,
    stockQty: 28,
    media: [
      { url: IMG.plate1, alt: 'Speckled ceramic plate', storageKey: 'seed/speckled-plate-1', sortOrder: 0 },
    ],
  });

  await upsertProduct({
    shopId: pottery.shop.id,
    categoryId: cats.pottery.id,
    title: 'Tall Studio Vase',
    slug: 'studio-vase',
    description: 'Wheel-thrown vase with matte clay body and glossy interior. About 28cm tall.',
    status: 'active',
    sku: 'VASE-STU-01',
    priceCents: 4800,
    stockQty: 9,
    media: [
      { url: IMG.vase1, alt: 'Ceramic studio vase', storageKey: 'seed/studio-vase-1', sortOrder: 0 },
      { url: IMG.bowl1, alt: 'Vase detail', storageKey: 'seed/studio-vase-2', sortOrder: 1 },
    ],
  });

  await upsertProduct({
    shopId: pottery.shop.id,
    categoryId: cats.pottery.id,
    title: 'Studio Test Cup (draft)',
    slug: 'studio-test-cup',
    description: 'Internal draft — glaze experiment, not for sale yet.',
    status: 'draft',
    sku: 'DRAFT-CUP-01',
    priceCents: 1500,
    stockQty: 2,
    media: [
      { url: IMG.mug2, alt: 'Draft cup', storageKey: 'seed/draft-cup-1', sortOrder: 0 },
    ],
  });

  const board = await upsertProduct({
    shopId: wood.shop.id,
    categoryId: cats.woodwork.id,
    title: 'Walnut Cutting Board',
    slug: 'walnut-board',
    description: 'End-grain walnut board with food-safe oil finish. About 30×20cm.',
    status: 'active',
    sku: 'BOARD-WAL-01',
    priceCents: 4500,
    stockQty: 25,
    attributes: { wood: 'walnut' },
    media: [
      { url: IMG.board1, alt: 'Walnut cutting board', storageKey: 'seed/walnut-board-1', sortOrder: 0 },
      { url: IMG.board2, alt: 'Board with kitchen tools', storageKey: 'seed/walnut-board-2', sortOrder: 1 },
    ],
  });

  await upsertProduct({
    shopId: wood.shop.id,
    categoryId: cats.woodwork.id,
    title: 'Olive Wood Spoon',
    slug: 'olive-spoon',
    description: 'Carved olive-wood cooking spoon, sanded smooth. About 30cm.',
    status: 'active',
    sku: 'SPOON-OLV-01',
    priceCents: 1800,
    stockQty: 40,
    media: [
      { url: IMG.spoon1, alt: 'Olive wood cooking spoon', storageKey: 'seed/olive-spoon-1', sortOrder: 0 },
      { url: IMG.spoon2, alt: 'Wood utensils set', storageKey: 'seed/olive-spoon-2', sortOrder: 1 },
    ],
  });

  await upsertProduct({
    shopId: wood.shop.id,
    categoryId: cats.woodwork.id,
    title: 'Beech Butter Knife',
    slug: 'beech-butter-knife',
    description: 'Hand-shaped beech spreader with a soft oil finish. About 18cm.',
    status: 'active',
    sku: 'KNIFE-BEE-01',
    priceCents: 1400,
    stockQty: 30,
    media: [
      { url: IMG.knife1, alt: 'Wooden butter knife', storageKey: 'seed/beech-knife-1', sortOrder: 0 },
    ],
  });

  const ring = await upsertProduct({
    shopId: jewelry.shop.id,
    categoryId: cats.jewelry.id,
    title: 'Moonstone Band',
    slug: 'moonstone-band',
    description: 'Sterling silver band with a cabochon moonstone. Made to size.',
    status: 'active',
    sku: 'RING-MOON-01',
    priceCents: 6200,
    stockQty: 12,
    media: [
      { url: IMG.ring1, alt: 'Moonstone silver ring', storageKey: 'seed/moon-ring-1', sortOrder: 0 },
      { url: IMG.ring2, alt: 'Ring detail', storageKey: 'seed/moon-ring-2', sortOrder: 1 },
    ],
  });

  await upsertProduct({
    shopId: jewelry.shop.id,
    categoryId: cats.jewelry.id,
    title: 'River Pearl Necklace',
    slug: 'river-pearl-necklace',
    description: 'Freshwater pearls on a fine silver chain. 42cm with 5cm extender.',
    status: 'active',
    sku: 'NECK-PEARL-01',
    priceCents: 7800,
    stockQty: 8,
    media: [
      {
        url: IMG.necklace1,
        alt: 'Pearl necklace',
        storageKey: 'seed/pearl-neck-1',
        sortOrder: 0,
      },
    ],
  });

  await upsertProduct({
    shopId: jewelry.shop.id,
    categoryId: cats.jewelry.id,
    title: 'Hammered Drop Earrings',
    slug: 'hammered-drops',
    description: 'Lightweight sterling drops with a soft hammered texture. Hook backs.',
    status: 'active',
    sku: 'EAR-HAM-01',
    priceCents: 3400,
    stockQty: 15,
    media: [
      { url: IMG.earrings1, alt: 'Silver drop earrings', storageKey: 'seed/hammered-drops-1', sortOrder: 0 },
    ],
  });

  const scarf = await upsertProduct({
    shopId: textiles.shop.id,
    categoryId: cats.textiles.id,
    title: 'Indigo Handloom Scarf',
    slug: 'indigo-scarf',
    description: 'Cotton handloom scarf dyed with natural indigo. 180×50cm.',
    status: 'active',
    sku: 'SCARF-IND-01',
    priceCents: 3200,
    stockQty: 20,
    media: [
      { url: IMG.scarf1, alt: 'Indigo scarf folded', storageKey: 'seed/indigo-scarf-1', sortOrder: 0 },
      { url: IMG.scarf2, alt: 'Scarf worn', storageKey: 'seed/indigo-scarf-2', sortOrder: 1 },
    ],
  });

  await upsertProduct({
    shopId: textiles.shop.id,
    categoryId: cats.textiles.id,
    title: 'Block-Print Cushion Cover',
    slug: 'block-print-cushion',
    description: 'Cotton cushion cover with hand block print. 45×45cm. Cover only.',
    status: 'active',
    sku: 'CUSH-BP-01',
    priceCents: 2600,
    stockQty: 22,
    media: [
      { url: IMG.cushion1, alt: 'Block print cushion', storageKey: 'seed/cushion-1', sortOrder: 0 },
    ],
  });

  await upsertProduct({
    shopId: textiles.shop.id,
    categoryId: cats.textiles.id,
    title: 'Archived Runner (archived)',
    slug: 'archived-runner',
    description: 'Previous season table runner — archived listing.',
    status: 'archived',
    sku: 'RUN-ARCH-01',
    priceCents: 4000,
    stockQty: 0,
    media: [
      { url: IMG.scarf1, alt: 'Archived runner', storageKey: 'seed/archived-runner-1', sortOrder: 0 },
    ],
  });

  const honey = await upsertProduct({
    shopId: food.shop.id,
    categoryId: cats['food-crafts'].id,
    title: 'Wildflower Honey 500g',
    slug: 'wildflower-honey',
    description: 'Raw wildflower honey from foothill hives. Glass jar, 500g.',
    status: 'active',
    sku: 'HONEY-WF-500',
    priceCents: 2400,
    stockQty: 60,
    media: [
      { url: IMG.honey1, alt: 'Wildflower honey jar', storageKey: 'seed/honey-1', sortOrder: 0 },
      { url: IMG.honey2, alt: 'Honey jar detail', storageKey: 'seed/honey-2', sortOrder: 1 },
    ],
  });

  await upsertProduct({
    shopId: food.shop.id,
    categoryId: cats['food-crafts'].id,
    title: 'Apricot Jam 250g',
    slug: 'apricot-jam',
    description: 'Low-sugar apricot preserve. Glass jar, 250g.',
    status: 'active',
    sku: 'JAM-APR-250',
    priceCents: 1600,
    stockQty: 35,
    media: [
      { url: IMG.jam1, alt: 'Apricot jam jar', storageKey: 'seed/jam-1', sortOrder: 0 },
      { url: IMG.jam2, alt: 'Preserve jars', storageKey: 'seed/jam-2', sortOrder: 1 },
    ],
  });

  await upsertProduct({
    shopId: food.shop.id,
    categoryId: cats['food-crafts'].id,
    title: 'Orange Blossom Honey 250g',
    slug: 'orange-blossom-honey',
    description: 'Mild citrus-note honey in a smaller tasting jar. 250g.',
    status: 'active',
    sku: 'HONEY-OB-250',
    priceCents: 1600,
    stockQty: 40,
    media: [
      { url: IMG.honey2, alt: 'Orange blossom honey', storageKey: 'seed/orange-honey-1', sortOrder: 0 },
    ],
  });

  // Extra catalog volume so Explore pagination is visible (page size 24).
  const extraActive: Array<{
    shopId: string;
    categoryId: string;
    title: string;
    slug: string;
    description: string;
    sku: string;
    priceCents: number;
    stockQty: number;
    media: MediaSeed[];
  }> = [
    {
      shopId: pottery.shop.id,
      categoryId: cats.pottery.id,
      title: 'Pour-Over Cup',
      slug: 'pour-over-cup',
      description: 'Small pour-over cup with drip lip. Holds about 200ml.',
      sku: 'CUP-POUR-01',
      priceCents: 1900,
      stockQty: 24,
      media: [{ url: IMG.mug1, alt: 'Pour-over cup', storageKey: 'seed/pour-cup-1', sortOrder: 0 }],
    },
    {
      shopId: pottery.shop.id,
      categoryId: cats.pottery.id,
      title: 'Espresso Pair',
      slug: 'espresso-pair',
      description: 'Set of two espresso cups with matching saucers.',
      sku: 'ESP-PAIR-01',
      priceCents: 4200,
      stockQty: 14,
      media: [
        { url: IMG.mug2, alt: 'Espresso cups', storageKey: 'seed/espresso-1', sortOrder: 0 },
        { url: IMG.plate1, alt: 'Cups with saucers', storageKey: 'seed/espresso-2', sortOrder: 1 },
      ],
    },
    {
      shopId: pottery.shop.id,
      categoryId: cats.pottery.id,
      title: 'Bud Vase Mini',
      slug: 'bud-vase-mini',
      description: 'Petite bud vase for a single stem. About 12cm.',
      sku: 'VASE-BUD-01',
      priceCents: 2100,
      stockQty: 20,
      media: [{ url: IMG.vase1, alt: 'Mini bud vase', storageKey: 'seed/bud-vase-1', sortOrder: 0 }],
    },
    {
      shopId: wood.shop.id,
      categoryId: cats.woodwork.id,
      title: 'Teak Salad Servers',
      slug: 'teak-salad-servers',
      description: 'Matched teak fork and spoon for salads. Oil-finished.',
      sku: 'SERV-TEAK-01',
      priceCents: 3200,
      stockQty: 16,
      media: [
        { url: IMG.spoon1, alt: 'Teak salad servers', storageKey: 'seed/salad-1', sortOrder: 0 },
        { url: IMG.spoon2, alt: 'Servers detail', storageKey: 'seed/salad-2', sortOrder: 1 },
      ],
    },
    {
      shopId: wood.shop.id,
      categoryId: cats.woodwork.id,
      title: 'Maple Coaster Set',
      slug: 'maple-coasters',
      description: 'Set of four maple coasters with cork backing.',
      sku: 'COAST-MAP-04',
      priceCents: 2400,
      stockQty: 30,
      media: [{ url: IMG.board1, alt: 'Maple coasters', storageKey: 'seed/coasters-1', sortOrder: 0 }],
    },
    {
      shopId: wood.shop.id,
      categoryId: cats.woodwork.id,
      title: 'Walnut Letter Opener',
      slug: 'walnut-letter-opener',
      description: 'Slim walnut letter opener with rounded tip.',
      sku: 'OPEN-WAL-01',
      priceCents: 1600,
      stockQty: 22,
      media: [{ url: IMG.knife1, alt: 'Walnut letter opener', storageKey: 'seed/opener-1', sortOrder: 0 }],
    },
    {
      shopId: jewelry.shop.id,
      categoryId: cats.jewelry.id,
      title: 'Thin Stacking Ring',
      slug: 'thin-stacking-ring',
      description: 'Delicate sterling stacking band. Available in standard sizes.',
      sku: 'RING-STACK-01',
      priceCents: 2800,
      stockQty: 25,
      media: [{ url: IMG.ring2, alt: 'Stacking ring', storageKey: 'seed/stack-ring-1', sortOrder: 0 }],
    },
    {
      shopId: jewelry.shop.id,
      categoryId: cats.jewelry.id,
      title: 'Cuff Bracelet',
      slug: 'silver-cuff',
      description: 'Open silver cuff with brushed finish. Adjustable fit.',
      sku: 'CUFF-SIL-01',
      priceCents: 5400,
      stockQty: 11,
      media: [
        { url: IMG.necklace1, alt: 'Silver cuff', storageKey: 'seed/cuff-1', sortOrder: 0 },
        { url: IMG.earrings1, alt: 'Cuff on wrist', storageKey: 'seed/cuff-2', sortOrder: 1 },
      ],
    },
    {
      shopId: jewelry.shop.id,
      categoryId: cats.jewelry.id,
      title: 'Stud Earrings',
      slug: 'silver-studs',
      description: 'Everyday sterling studs with secure butterfly backs.',
      sku: 'STUD-SIL-01',
      priceCents: 2200,
      stockQty: 28,
      media: [{ url: IMG.earrings1, alt: 'Silver stud earrings', storageKey: 'seed/studs-1', sortOrder: 0 }],
    },
    {
      shopId: textiles.shop.id,
      categoryId: cats.textiles.id,
      title: 'Linen Tea Towel',
      slug: 'linen-tea-towel',
      description: 'Stonewashed linen tea towel with hand-stitched hem.',
      sku: 'TOWEL-LIN-01',
      priceCents: 1800,
      stockQty: 35,
      media: [{ url: IMG.scarf1, alt: 'Linen tea towel', storageKey: 'seed/towel-1', sortOrder: 0 }],
    },
    {
      shopId: textiles.shop.id,
      categoryId: cats.textiles.id,
      title: 'Wool Throw Stripe',
      slug: 'wool-throw-stripe',
      description: 'Lightweight wool throw with soft stripe. About 140×180cm.',
      sku: 'THROW-WOOL-01',
      priceCents: 8900,
      stockQty: 8,
      media: [
        { url: IMG.throw1, alt: 'Wool throw on sofa', storageKey: 'seed/throw-1', sortOrder: 0 },
        { url: IMG.throw2, alt: 'Folded wool throw', storageKey: 'seed/throw-2', sortOrder: 1 },
      ],
    },
    {
      shopId: textiles.shop.id,
      categoryId: cats.textiles.id,
      title: 'Kitchen Apron',
      slug: 'canvas-apron',
      description: 'Heavy cotton canvas apron with adjustable neck strap.',
      sku: 'APRON-CAN-01',
      priceCents: 3600,
      stockQty: 18,
      media: [{ url: IMG.cushion1, alt: 'Canvas apron', storageKey: 'seed/apron-1', sortOrder: 0 }],
    },
    {
      shopId: food.shop.id,
      categoryId: cats['food-crafts'].id,
      title: 'Chili Oil 200ml',
      slug: 'chili-oil',
      description: 'Small-batch chili oil with toasted garlic. Glass bottle, 200ml.',
      sku: 'OIL-CHILI-200',
      priceCents: 1800,
      stockQty: 45,
      media: [{ url: IMG.jam1, alt: 'Chili oil bottle', storageKey: 'seed/chili-1', sortOrder: 0 }],
    },
    {
      shopId: food.shop.id,
      categoryId: cats['food-crafts'].id,
      title: 'Fig Preserve 250g',
      slug: 'fig-preserve',
      description: 'Slow-cooked fig preserve. Glass jar, 250g.',
      sku: 'JAM-FIG-250',
      priceCents: 1700,
      stockQty: 32,
      media: [
        { url: IMG.jam2, alt: 'Fig preserve', storageKey: 'seed/fig-1', sortOrder: 0 },
        { url: IMG.honey1, alt: 'Preserve jar', storageKey: 'seed/fig-2', sortOrder: 1 },
      ],
    },
    {
      shopId: food.shop.id,
      categoryId: cats['food-crafts'].id,
      title: 'Sesame Halva Bar',
      slug: 'sesame-halva',
      description: 'Traditional sesame halva bar wrapped for gifting. About 200g.',
      sku: 'HALVA-SES-01',
      priceCents: 1200,
      stockQty: 50,
      media: [{ url: IMG.honey2, alt: 'Sesame halvah', storageKey: 'seed/halva-1', sortOrder: 0 }],
    },
    // +30 more actives so catalog stays dense after pagination (6 per approved maker).
    {
      shopId: pottery.shop.id,
      categoryId: cats.pottery.id,
      title: 'Soup Bowl Speckle',
      slug: 'soup-bowl-speckle',
      description: 'Deep speckled bowl for soups and stews. About 16cm.',
      sku: 'BOWL-SOUP-01',
      priceCents: 2700,
      stockQty: 18,
      media: [{ url: IMG.bowl1, alt: 'Speckled soup bowl', storageKey: 'seed/soup-bowl-1', sortOrder: 0 }],
    },
    {
      shopId: pottery.shop.id,
      categoryId: cats.pottery.id,
      title: 'Dinner Plate Set',
      slug: 'dinner-plate-set',
      description: 'Set of two handmade dinner plates with soft rim.',
      sku: 'PLATE-DIN-02',
      priceCents: 5800,
      stockQty: 12,
      media: [
        { url: IMG.plate1, alt: 'Dinner plates', storageKey: 'seed/dinner-1', sortOrder: 0 },
        { url: IMG.bowl1, alt: 'Plate stack', storageKey: 'seed/dinner-2', sortOrder: 1 },
      ],
    },
    {
      shopId: pottery.shop.id,
      categoryId: cats.pottery.id,
      title: 'Oil Pourer',
      slug: 'oil-pourer',
      description: 'Narrow-neck ceramic oil pourer with cork stopper.',
      sku: 'POUR-OIL-01',
      priceCents: 3100,
      stockQty: 15,
      media: [{ url: IMG.vase1, alt: 'Ceramic oil pourer', storageKey: 'seed/oil-pour-1', sortOrder: 0 }],
    },
    {
      shopId: pottery.shop.id,
      categoryId: cats.pottery.id,
      title: 'Ramen Bowl',
      slug: 'ramen-bowl',
      description: 'Wide ramen bowl with deep well. Holds about 900ml.',
      sku: 'BOWL-RAMEN-01',
      priceCents: 3400,
      stockQty: 16,
      media: [{ url: IMG.bowl1, alt: 'Ramen bowl', storageKey: 'seed/ramen-1', sortOrder: 0 }],
    },
    {
      shopId: pottery.shop.id,
      categoryId: cats.pottery.id,
      title: 'Herb Planter',
      slug: 'herb-planter',
      description: 'Unglazed planter with drainage for kitchen herbs.',
      sku: 'PLANTER-HERB-01',
      priceCents: 2500,
      stockQty: 20,
      media: [{ url: IMG.vase1, alt: 'Herb planter', storageKey: 'seed/planter-1', sortOrder: 0 }],
    },
    {
      shopId: pottery.shop.id,
      categoryId: cats.pottery.id,
      title: 'Butter Dish',
      slug: 'butter-dish',
      description: 'Covered butter dish with soft matte glaze.',
      sku: 'BUTTER-01',
      priceCents: 2900,
      stockQty: 14,
      media: [{ url: IMG.plate1, alt: 'Butter dish', storageKey: 'seed/butter-1', sortOrder: 0 }],
    },
    {
      shopId: wood.shop.id,
      categoryId: cats.woodwork.id,
      title: 'Oak Serving Tray',
      slug: 'oak-serving-tray',
      description: 'Rectangular oak tray with cutout handles.',
      sku: 'TRAY-OAK-01',
      priceCents: 4800,
      stockQty: 10,
      media: [
        { url: IMG.board1, alt: 'Oak serving tray', storageKey: 'seed/tray-1', sortOrder: 0 },
        { url: IMG.board2, alt: 'Tray grain', storageKey: 'seed/tray-2', sortOrder: 1 },
      ],
    },
    {
      shopId: wood.shop.id,
      categoryId: cats.woodwork.id,
      title: 'Beech Rolling Pin',
      slug: 'beech-rolling-pin',
      description: 'Classic beech rolling pin, lightly waxed.',
      sku: 'PIN-BEECH-01',
      priceCents: 2200,
      stockQty: 20,
      media: [{ url: IMG.spoon1, alt: 'Beech rolling pin', storageKey: 'seed/pin-1', sortOrder: 0 }],
    },
    {
      shopId: wood.shop.id,
      categoryId: cats.woodwork.id,
      title: 'Cherry Butter Knife',
      slug: 'cherry-butter-knife',
      description: 'Hand-carved cherry wood butter knife.',
      sku: 'KNIFE-BUTTER-01',
      priceCents: 1400,
      stockQty: 28,
      media: [{ url: IMG.knife1, alt: 'Cherry butter knife', storageKey: 'seed/butter-knife-1', sortOrder: 0 }],
    },
    {
      shopId: wood.shop.id,
      categoryId: cats.woodwork.id,
      title: 'Walnut Phone Stand',
      slug: 'walnut-phone-stand',
      description: 'Minimal walnut stand for phones and tablets.',
      sku: 'STAND-WAL-01',
      priceCents: 2600,
      stockQty: 18,
      media: [{ url: IMG.board2, alt: 'Walnut phone stand', storageKey: 'seed/stand-1', sortOrder: 0 }],
    },
    {
      shopId: wood.shop.id,
      categoryId: cats.woodwork.id,
      title: 'Spice Scoop Set',
      slug: 'spice-scoop-set',
      description: 'Set of three nested hardwood spice scoops.',
      sku: 'SCOOP-SPICE-03',
      priceCents: 1900,
      stockQty: 24,
      media: [{ url: IMG.spoon2, alt: 'Spice scoops', storageKey: 'seed/scoops-1', sortOrder: 0 }],
    },
    {
      shopId: wood.shop.id,
      categoryId: cats.woodwork.id,
      title: 'Cutting Board Mini',
      slug: 'cutting-board-mini',
      description: 'Compact maple board for cheese and fruit.',
      sku: 'BOARD-MINI-01',
      priceCents: 2800,
      stockQty: 22,
      media: [{ url: IMG.board1, alt: 'Mini cutting board', storageKey: 'seed/board-mini-1', sortOrder: 0 }],
    },
    {
      shopId: jewelry.shop.id,
      categoryId: cats.jewelry.id,
      title: 'Coin Pendant',
      slug: 'coin-pendant',
      description: 'Hammered coin pendant on a fine chain.',
      sku: 'PEND-COIN-01',
      priceCents: 4600,
      stockQty: 12,
      media: [{ url: IMG.necklace1, alt: 'Coin pendant', storageKey: 'seed/coin-1', sortOrder: 0 }],
    },
    {
      shopId: jewelry.shop.id,
      categoryId: cats.jewelry.id,
      title: 'Twisted Band Ring',
      slug: 'twisted-band-ring',
      description: 'Twisted sterling band with brushed texture.',
      sku: 'RING-TWIST-01',
      priceCents: 3600,
      stockQty: 16,
      media: [{ url: IMG.ring1, alt: 'Twisted band ring', storageKey: 'seed/twist-1', sortOrder: 0 }],
    },
    {
      shopId: jewelry.shop.id,
      categoryId: cats.jewelry.id,
      title: 'Drop Earrings',
      slug: 'drop-earrings',
      description: 'Lightweight drop earrings with secure hooks.',
      sku: 'EAR-DROP-01',
      priceCents: 3900,
      stockQty: 14,
      media: [{ url: IMG.earrings1, alt: 'Drop earrings', storageKey: 'seed/drop-1', sortOrder: 0 }],
    },
    {
      shopId: jewelry.shop.id,
      categoryId: cats.jewelry.id,
      title: 'Link Bracelet',
      slug: 'link-bracelet',
      description: 'Simple linked bracelet with lobster clasp.',
      sku: 'BRACE-LINK-01',
      priceCents: 5200,
      stockQty: 10,
      media: [{ url: IMG.ring2, alt: 'Link bracelet', storageKey: 'seed/link-1', sortOrder: 0 }],
    },
    {
      shopId: jewelry.shop.id,
      categoryId: cats.jewelry.id,
      title: 'Bar Necklace',
      slug: 'bar-necklace',
      description: 'Minimal horizontal bar on a delicate chain.',
      sku: 'NECK-BAR-01',
      priceCents: 4100,
      stockQty: 15,
      media: [{ url: IMG.necklace1, alt: 'Bar necklace', storageKey: 'seed/bar-1', sortOrder: 0 }],
    },
    {
      shopId: jewelry.shop.id,
      categoryId: cats.jewelry.id,
      title: 'Signet Ring',
      slug: 'signet-ring',
      description: 'Classic oval signet in sterling silver.',
      sku: 'RING-SIGN-01',
      priceCents: 6200,
      stockQty: 9,
      media: [{ url: IMG.ring1, alt: 'Signet ring', storageKey: 'seed/signet-1', sortOrder: 0 }],
    },
    {
      shopId: textiles.shop.id,
      categoryId: cats.textiles.id,
      title: 'Cotton Napkin Set',
      slug: 'cotton-napkin-set',
      description: 'Set of four stonewashed cotton napkins.',
      sku: 'NAP-COT-04',
      priceCents: 2400,
      stockQty: 26,
      media: [{ url: IMG.scarf1, alt: 'Cotton napkins', storageKey: 'seed/napkins-1', sortOrder: 0 }],
    },
    {
      shopId: textiles.shop.id,
      categoryId: cats.textiles.id,
      title: 'Woven Placemat Pair',
      slug: 'woven-placemat-pair',
      description: 'Pair of handwoven placemats with fringed edges.',
      sku: 'PLACE-WOV-02',
      priceCents: 3200,
      stockQty: 18,
      media: [{ url: IMG.cushion1, alt: 'Woven placemats', storageKey: 'seed/place-1', sortOrder: 0 }],
    },
    {
      shopId: textiles.shop.id,
      categoryId: cats.textiles.id,
      title: 'Linen Pillow Cover',
      slug: 'linen-pillow-cover',
      description: 'Natural linen pillow cover, 45×45cm, envelope back.',
      sku: 'PILLOW-LIN-01',
      priceCents: 2900,
      stockQty: 20,
      media: [{ url: IMG.cushion1, alt: 'Linen pillow cover', storageKey: 'seed/pillow-1', sortOrder: 0 }],
    },
    {
      shopId: textiles.shop.id,
      categoryId: cats.textiles.id,
      title: 'Market Tote',
      slug: 'market-tote',
      description: 'Sturdy canvas market tote with long straps.',
      sku: 'TOTE-MKT-01',
      priceCents: 2800,
      stockQty: 22,
      media: [{ url: IMG.scarf2, alt: 'Market tote', storageKey: 'seed/tote-1', sortOrder: 0 }],
    },
    {
      shopId: textiles.shop.id,
      categoryId: cats.textiles.id,
      title: 'Wool Beanie',
      slug: 'wool-beanie',
      description: 'Hand-knit wool beanie in undyed yarn.',
      sku: 'BEANIE-WOOL-01',
      priceCents: 2600,
      stockQty: 16,
      media: [{ url: IMG.scarf1, alt: 'Wool beanie', storageKey: 'seed/beanie-1', sortOrder: 0 }],
    },
    {
      shopId: textiles.shop.id,
      categoryId: cats.textiles.id,
      title: 'Table Runner',
      slug: 'table-runner',
      description: 'Woven table runner, about 40×140cm.',
      sku: 'RUNNER-01',
      priceCents: 4500,
      stockQty: 11,
      media: [
        { url: IMG.scarf2, alt: 'Table runner', storageKey: 'seed/runner-1', sortOrder: 0 },
        { url: IMG.cushion1, alt: 'Runner detail', storageKey: 'seed/runner-2', sortOrder: 1 },
      ],
    },
    {
      shopId: food.shop.id,
      categoryId: cats['food-crafts'].id,
      title: 'Spiced Nuts Mix',
      slug: 'spiced-nuts-mix',
      description: 'Roasted mixed nuts with mild spice. 200g pouch.',
      sku: 'NUTS-SPICE-200',
      priceCents: 1500,
      stockQty: 40,
      media: [{ url: IMG.jam1, alt: 'Spiced nuts', storageKey: 'seed/nuts-1', sortOrder: 0 }],
    },
    {
      shopId: food.shop.id,
      categoryId: cats['food-crafts'].id,
      title: 'Dried Apricots',
      slug: 'dried-apricots',
      description: 'Sun-dried apricots from small orchards. 250g.',
      sku: 'APRICOT-250',
      priceCents: 1400,
      stockQty: 38,
      media: [{ url: IMG.jam2, alt: 'Dried apricots', storageKey: 'seed/apricot-1', sortOrder: 0 }],
    },
    {
      shopId: food.shop.id,
      categoryId: cats['food-crafts'].id,
      title: 'Herb Salt Blend',
      slug: 'herb-salt-blend',
      description: 'Sea salt with dried herbs in a glass jar. 120g.',
      sku: 'SALT-HERB-120',
      priceCents: 1100,
      stockQty: 48,
      media: [{ url: IMG.honey1, alt: 'Herb salt jar', storageKey: 'seed/salt-1', sortOrder: 0 }],
    },
    {
      shopId: food.shop.id,
      categoryId: cats['food-crafts'].id,
      title: 'Rose Petal Jam',
      slug: 'rose-petal-jam',
      description: 'Delicate rose petal jam. Glass jar, 200g.',
      sku: 'JAM-ROSE-200',
      priceCents: 1900,
      stockQty: 28,
      media: [{ url: IMG.jam1, alt: 'Rose petal jam', storageKey: 'seed/rose-jam-1', sortOrder: 0 }],
    },
    {
      shopId: food.shop.id,
      categoryId: cats['food-crafts'].id,
      title: 'Date Syrup 300ml',
      slug: 'date-syrup',
      description: 'Naturally sweet date syrup for drinks and baking. 300ml.',
      sku: 'SYRUP-DATE-300',
      priceCents: 2100,
      stockQty: 30,
      media: [{ url: IMG.honey2, alt: 'Date syrup', storageKey: 'seed/date-syrup-1', sortOrder: 0 }],
    },
    {
      shopId: food.shop.id,
      categoryId: cats['food-crafts'].id,
      title: 'Pickled Olives',
      slug: 'pickled-olives',
      description: 'House-brined olives with lemon zest. 350g jar.',
      sku: 'OLIVE-PICK-350',
      priceCents: 1600,
      stockQty: 34,
      media: [{ url: IMG.jam2, alt: 'Pickled olives', storageKey: 'seed/olives-1', sortOrder: 0 }],
    },
  ];

  for (const p of extraActive) {
    await upsertProduct({ ...p, status: 'active' });
  }

  const commissionBps = 1000;

  // Buyer / vendor / admin order states
  await ensureSeedOrder({
    idempotencyKey: 'seed-order-pending-payment',
    buyerId: buyer.id,
    status: 'pending_payment',
    vendorOrderStatus: 'awaiting_payment',
    vendorId: pottery.id,
    shippingCents: 400,
    commissionBps,
    paymentStatus: 'pending',
    transferStatus: null,
    daysAgo: 0,
    items: [
      {
        productId: mug.id,
        variantId: mug.variants[0]!.id,
        title: mug.title,
        productSlug: mug.slug,
        sku: mug.variants[0]!.sku,
        unitPriceCents: 2800,
        quantity: 1,
      },
    ],
  });

  await ensureSeedOrder({
    idempotencyKey: 'seed-order-paid-fulfilling',
    buyerId: buyer.id,
    status: 'paid',
    vendorOrderStatus: 'fulfilling',
    vendorId: wood.id,
    shippingCents: 600,
    commissionBps,
    paymentStatus: 'succeeded',
    transferStatus: 'pending',
    daysAgo: 1,
    items: [
      {
        productId: board.id,
        variantId: board.variants[0]!.id,
        title: board.title,
        productSlug: board.slug,
        sku: board.variants[0]!.sku,
        unitPriceCents: 4500,
        quantity: 1,
      },
    ],
  });

  await ensureSeedOrder({
    idempotencyKey: 'seed-order-shipped',
    buyerId: buyer2.id,
    status: 'processing',
    vendorOrderStatus: 'shipped',
    vendorId: jewelry.id,
    shippingCents: 350,
    commissionBps,
    paymentStatus: 'succeeded',
    transferStatus: 'paid',
    trackingNumber: 'TCS-884512',
    carrier: 'TCS',
    daysAgo: 5,
    items: [
      {
        productId: ring.id,
        variantId: ring.variants[0]!.id,
        title: ring.title,
        productSlug: ring.slug,
        sku: ring.variants[0]!.sku,
        unitPriceCents: 6200,
        quantity: 1,
      },
    ],
  });

  await ensureSeedOrder({
    idempotencyKey: 'seed-order-delivered',
    buyerId: buyer.id,
    status: 'completed',
    vendorOrderStatus: 'delivered',
    vendorId: textiles.id,
    shippingCents: 450,
    commissionBps,
    paymentStatus: 'succeeded',
    transferStatus: 'paid',
    trackingNumber: 'LEO-22901',
    carrier: 'Leopard',
    daysAgo: 12,
    items: [
      {
        productId: scarf.id,
        variantId: scarf.variants[0]!.id,
        title: scarf.title,
        productSlug: scarf.slug,
        sku: scarf.variants[0]!.sku,
        unitPriceCents: 3200,
        quantity: 2,
      },
    ],
  });

  await ensureSeedOrder({
    idempotencyKey: 'seed-order-cancelled',
    buyerId: buyer2.id,
    status: 'cancelled',
    vendorOrderStatus: 'cancelled',
    vendorId: food.id,
    shippingCents: 550,
    commissionBps,
    paymentStatus: 'cancelled',
    transferStatus: null,
    daysAgo: 4,
    items: [
      {
        productId: honey.id,
        variantId: honey.variants[0]!.id,
        title: honey.title,
        productSlug: honey.slug,
        sku: honey.variants[0]!.sku,
        unitPriceCents: 2400,
        quantity: 1,
      },
    ],
  });

  await ensureSeedOrder({
    idempotencyKey: 'seed-order-refunded-debt',
    buyerId: buyer2.id,
    status: 'refunded',
    vendorOrderStatus: 'refunded',
    vendorId: pottery.id,
    shippingCents: 400,
    commissionBps,
    paymentStatus: 'refunded',
    transferStatus: 'paid',
    daysAgo: 20,
    ledgerDebtCents: 12000,
    items: [
      {
        productId: bowl.id,
        variantId: bowl.variants[0]!.id,
        title: bowl.title,
        productSlug: bowl.slug,
        sku: bowl.variants[0]!.sku,
        unitPriceCents: 3600,
        quantity: 3,
      },
    ],
  });

  // Paid multi-item order for commission demo
  await ensureSeedOrder({
    idempotencyKey: 'seed-order-paid-simple',
    buyerId: buyer.id,
    status: 'paid',
    vendorOrderStatus: 'paid',
    vendorId: food.id,
    shippingCents: 550,
    commissionBps,
    paymentStatus: 'succeeded',
    transferStatus: 'pending',
    daysAgo: 2,
    items: [
      {
        productId: honey.id,
        variantId: honey.variants[0]!.id,
        title: honey.title,
        productSlug: honey.slug,
        sku: honey.variants[0]!.sku,
        unitPriceCents: 2400,
        quantity: 2,
      },
    ],
  });

  // Review on delivered product
  await prisma.review.upsert({
    where: { productId_userId: { productId: scarf.id, userId: buyer.id } },
    update: {
      rating: 5,
      body: 'Beautiful weave and the indigo is even richer in person. Packaged carefully.',
      verifiedPurchase: true,
    },
    create: {
      productId: scarf.id,
      userId: buyer.id,
      rating: 5,
      body: 'Beautiful weave and the indigo is even richer in person. Packaged carefully.',
      verifiedPurchase: true,
    },
  });

  console.log('Seed complete.');
  console.log('  Admin:     admin@crafthub.local / Admin123!');
  console.log('  Buyer:     buyer@crafthub.local / Buyer123!');
  console.log('  Vendor:    pottery@crafthub.local / Vendor123!  → /shops/clay-ember');
  console.log('  Vendor:    wood@crafthub.local / Vendor123!     → /shops/grain-groove');
  console.log('  Vendor:    jewelry@crafthub.local / Vendor123!  → /shops/noor-atelier');
  console.log('  Vendor:    textiles@crafthub.local / Vendor123! → /shops/loom-light');
  console.log('  Vendor:    food@crafthub.local / Vendor123!     → /shops/orchard-pantry');
  console.log('  Pending:   pending@crafthub.local / Vendor123!');
  console.log('  Suspended: suspended@crafthub.local / Vendor123!');
  console.log(`  Admin id: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
