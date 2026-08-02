import { z } from 'zod';

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
