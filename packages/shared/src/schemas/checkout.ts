import { z } from 'zod';

export const shippingAddressSchema = z.object({
  name: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().min(1).max(120),
  region: z.string().trim().max(120).optional().nullable(),
  postalCode: z.string().trim().min(1).max(32),
  country: z.string().trim().length(2).default('US'),
});

export const checkoutSessionSchema = z.object({
  shipping: shippingAddressSchema,
  saveAddress: z.boolean().optional().default(false),
});

export const createAddressSchema = shippingAddressSchema;

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;
export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;
