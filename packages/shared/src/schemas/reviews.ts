import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional().default(''),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
