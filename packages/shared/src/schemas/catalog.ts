import { z } from 'zod';
import { PRODUCT_STATUSES, VENDOR_STATUSES } from '../enums.js';

export const vendorApplySchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  bio: z.string().trim().max(2000).optional(),
  city: z.string().trim().min(1).max(80),
  craftTags: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  attestation: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm you make what you sell' }),
  }),
});

export const updateShopSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(2000).optional(),
  city: z.string().trim().min(1).max(80).optional(),
  logoUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  shippingPolicy: z.string().trim().max(4000).optional().nullable(),
  returnsPolicy: z.string().trim().max(4000).optional().nullable(),
  flatShippingCents: z.number().int().min(0).max(1_000_000).optional(),
  shipsFromCity: z.string().trim().max(80).optional().nullable(),
  craftTags: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
});

export const variantInputSchema = z.object({
  sku: z.string().trim().max(64).optional().nullable(),
  priceCents: z.number().int().min(0).max(100_000_000),
  currency: z.string().length(3).default('USD'),
  stockQty: z.number().int().min(0).max(1_000_000).default(0),
  attributes: z.record(z.string()).default({}),
});

export const createProductSchema = z
  .object({
    title: z.string().trim().min(2).max(140),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    description: z.string().trim().max(10_000).default(''),
    categoryId: z.string().uuid().optional().nullable(),
    status: z.enum(PRODUCT_STATUSES).default('draft'),
    variants: z.array(variantInputSchema).min(1).max(20),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'active' && !data.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Active products require a category',
        path: ['categoryId'],
      });
    }
  });

export const updateProductSchema = z.object({
  title: z.string().trim().min(2).max(140).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(10_000).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  variants: z.array(variantInputSchema.extend({ id: z.string().uuid().optional() })).min(1).max(20).optional(),
});

export const suggestCategorySchema = z.object({
  proposedName: z.string().trim().min(2).max(80),
  note: z.string().trim().max(500).optional().default(''),
});

export type SuggestCategoryInput = z.infer<typeof suggestCategorySchema>;

export const addMediaSchema = z.object({
  url: z.string().url(),
  alt: z.string().trim().max(200).default(''),
  sortOrder: z.number().int().min(0).max(100).optional(),
});

export const adminVendorPatchSchema = z.object({
  status: z.enum(VENDOR_STATUSES),
  reason: z.string().trim().max(500).optional(),
});

export type VendorApplyInput = z.infer<typeof vendorApplySchema>;
export type UpdateShopInput = z.infer<typeof updateShopSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AddMediaInput = z.infer<typeof addMediaSchema>;
export type AdminVendorPatchInput = z.infer<typeof adminVendorPatchSchema>;
