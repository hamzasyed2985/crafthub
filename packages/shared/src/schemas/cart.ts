import { z } from 'zod';

export const addCartItemSchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().min(1).max(99).default(1),
});

export const updateCartItemSchema = z.object({
  qty: z.number().int().min(0).max(99),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
