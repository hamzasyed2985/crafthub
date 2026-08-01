import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Hash passwords the same way the API does (bcryptjs). */
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

async function main() {
  console.log('Seeding CraftHub…');

  await prisma.platformSettings.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      commissionBps: 1000,
      currency: 'USD',
    },
  });

  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: cat,
    });
  }

  const adminHash = await hashPassword('Admin123!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@crafthub.local' },
    update: { role: 'admin', passwordHash: adminHash },
    create: {
      email: 'admin@crafthub.local',
      passwordHash: adminHash,
      name: 'CraftHub Admin',
      role: 'admin',
    },
  });

  const vendorHash = await hashPassword('Vendor123!');
  const vendorUser = await prisma.user.upsert({
    where: { email: 'pottery@crafthub.local' },
    update: { role: 'vendor', passwordHash: vendorHash },
    create: {
      email: 'pottery@crafthub.local',
      passwordHash: vendorHash,
      name: 'Amina Clay',
      role: 'vendor',
    },
  });

  const pottery = await prisma.category.findUniqueOrThrow({ where: { slug: 'pottery' } });

  const vendor = await prisma.vendorProfile.upsert({
    where: { userId: vendorUser.id },
    update: {
      status: 'approved',
      displayName: 'Clay & Ember Studio',
      bio: 'Small-batch pottery from Karachi — mugs, bowls, and wheel-thrown pieces.',
      city: 'Karachi',
      craftTags: ['pottery', 'mugs', 'handmade'],
    },
    create: {
      userId: vendorUser.id,
      displayName: 'Clay & Ember Studio',
      slug: 'clay-ember',
      bio: 'Small-batch pottery from Karachi — mugs, bowls, and wheel-thrown pieces.',
      city: 'Karachi',
      craftTags: ['pottery', 'mugs', 'handmade'],
      status: 'approved',
      bannerUrl:
        'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1600&q=80',
      logoUrl:
        'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=200&q=80',
      shop: {
        create: {
          shipsFromCity: 'Karachi',
          flatShippingCents: 400,
          shippingPolicy: 'Ships within 3–5 days via local courier.',
          returnsPolicy: 'Contact within 7 days for damaged items.',
        },
      },
      stripeAccount: { create: {} },
    },
    include: { shop: true },
  });

  if (!vendor.shop) {
    throw new Error('Shop missing after vendor upsert');
  }

  const existingMug = await prisma.product.findUnique({
    where: { shopId_slug: { shopId: vendor.shop.id, slug: 'ember-mug' } },
  });

  if (!existingMug) {
    await prisma.product.create({
      data: {
        shopId: vendor.shop.id,
        categoryId: pottery.id,
        title: 'Ember Mug',
        slug: 'ember-mug',
        description:
          'Wheel-thrown stoneware mug with a warm ember glaze. Holds about 300ml. Food-safe.',
        status: 'active',
        variants: {
          create: [
            {
              sku: 'MUG-EMBER-01',
              priceCents: 2800,
              currency: 'USD',
              stockQty: 12,
              attributes: { size: 'standard' },
            },
          ],
        },
        media: {
          create: [
            {
              url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80',
              storageKey: 'seed/ember-mug-1',
              alt: 'Handmade ceramic mug',
              sortOrder: 0,
            },
          ],
        },
      },
    });
  }

  console.log('Seed complete.');
  console.log('  Admin:  admin@crafthub.local / Admin123!');
  console.log('  Vendor: pottery@crafthub.local / Vendor123!');
  console.log(`  Shop:   /shops/clay-ember`);
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
