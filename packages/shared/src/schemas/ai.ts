import { z } from 'zod';

export const conciergeMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2000),
});

export const conciergeRequestSchema = z.object({
  messages: z.array(conciergeMessageSchema).min(1).max(20),
  limit: z.number().int().min(1).max(8).optional().default(6),
});

export type ConciergeRequest = z.infer<typeof conciergeRequestSchema>;

export const listingGenerateSchema = z.object({
  notes: z.string().trim().min(8).max(4000),
  categoryHint: z.string().trim().max(80).optional(),
  titleHint: z.string().trim().max(120).optional(),
});

export type ListingGenerateInput = z.infer<typeof listingGenerateSchema>;
