import { prisma, Prisma } from '@crafthub/db';

export type CatalogProductFilters = {
  q?: string;
  category?: string;
  shopSlug?: string;
  minPrice?: number;
  maxPrice?: number;
};

function catalogProductFilterSql(filters: CatalogProductFilters): Prisma.Sql {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`p.status = 'active'::"ProductStatus"`,
    Prisma.sql`v.status = 'approved'::"VendorStatus"`,
  ];

  if (filters.shopSlug) {
    conditions.push(Prisma.sql`v.slug = ${filters.shopSlug}`);
  }
  if (filters.category) {
    conditions.push(Prisma.sql`c.slug = ${filters.category}`);
  }
  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(Prisma.sql`(
      p.title ILIKE ${pattern}
      OR p.description ILIKE ${pattern}
      OR v.display_name ILIKE ${pattern}
      OR v.city ILIKE ${pattern}
    )`);
  }
  if (filters.minPrice !== undefined && !Number.isNaN(filters.minPrice)) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM product_variants pv_f
      WHERE pv_f.product_id = p.id AND pv_f.price_cents >= ${filters.minPrice}
    )`);
  }
  if (filters.maxPrice !== undefined && !Number.isNaN(filters.maxPrice)) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM product_variants pv_f
      WHERE pv_f.product_id = p.id AND pv_f.price_cents <= ${filters.maxPrice}
    )`);
  }

  return Prisma.join(conditions, ' AND ');
}

/** Paginated product IDs ordered by lowest variant price (DB-side sort). */
export async function fetchProductIdsByMinVariantPrice(
  filters: CatalogProductFilters,
  sort: 'price_asc' | 'price_desc',
  skip: number,
  limit: number,
): Promise<string[]> {
  const whereClause = catalogProductFilterSql(filters);

  const rows =
    sort === 'price_asc'
      ? await prisma.$queryRaw<{ id: string }[]>`
          SELECT p.id
          FROM products p
          INNER JOIN shops s ON s.id = p.shop_id
          INNER JOIN vendor_profiles v ON v.id = s.vendor_id
          LEFT JOIN categories c ON c.id = p.category_id
          INNER JOIN product_variants pv ON pv.product_id = p.id
          WHERE ${whereClause}
          GROUP BY p.id
          ORDER BY MIN(pv.price_cents) ASC
          OFFSET ${skip}
          LIMIT ${limit}
        `
      : await prisma.$queryRaw<{ id: string }[]>`
          SELECT p.id
          FROM products p
          INNER JOIN shops s ON s.id = p.shop_id
          INNER JOIN vendor_profiles v ON v.id = s.vendor_id
          LEFT JOIN categories c ON c.id = p.category_id
          INNER JOIN product_variants pv ON pv.product_id = p.id
          WHERE ${whereClause}
          GROUP BY p.id
          ORDER BY MIN(pv.price_cents) DESC
          OFFSET ${skip}
          LIMIT ${limit}
        `;

  return rows.map((row) => row.id);
}
