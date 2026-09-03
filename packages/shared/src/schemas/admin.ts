import { z } from 'zod';
import { CATEGORY_STATUSES, CATEGORY_SUGGESTION_STATUSES } from '../enums.js';

export const adminRefundSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export type AdminRefundInput = z.infer<typeof adminRefundSchema>;

export const adminSettingsPatchSchema = z.object({
  commissionBps: z.number().int().min(0).max(5000).optional(),
  debtReviewThresholdCents: z.number().int().min(0).max(10_000_000).optional(),
  currency: z.string().trim().min(3).max(3).optional(),
});

export type AdminSettingsPatchInput = z.infer<typeof adminSettingsPatchSchema>;

export const adminCategoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  featured: z.boolean().optional().default(false),
  sortOrder: z.number().int().min(0).max(10_000).optional().default(0),
});

export const adminCategoryPatchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  status: z.enum(CATEGORY_STATUSES).optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export const adminCategorySuggestionReviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  adminNote: z.string().trim().max(500).optional().nullable(),
  /** When approving, optionally override the created category name/slug. */
  name: z.string().trim().min(2).max(80).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  featured: z.boolean().optional().default(false),
});

export type AdminCategoryCreateInput = z.infer<typeof adminCategoryCreateSchema>;
export type AdminCategoryPatchInput = z.infer<typeof adminCategoryPatchSchema>;
export type AdminCategorySuggestionReviewInput = z.infer<
  typeof adminCategorySuggestionReviewSchema
>;

/** Re-export for convenience in admin suggestion filters. */
export { CATEGORY_SUGGESTION_STATUSES };
