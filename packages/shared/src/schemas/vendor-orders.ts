import { z } from 'zod';

export const shipVendorOrderSchema = z.object({
  trackingNumber: z.string().trim().min(1).max(120).optional().nullable(),
  carrier: z.string().trim().min(1).max(80).optional().nullable(),
});

export type ShipVendorOrderInput = z.infer<typeof shipVendorOrderSchema>;
