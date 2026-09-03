export const ROLES = ['customer', 'vendor', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ['active', 'banned'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const VENDOR_STATUSES = ['pending', 'approved', 'suspended'] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export const PRODUCT_STATUSES = ['draft', 'active', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const CATEGORY_STATUSES = ['active', 'archived'] as const;
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

export const CATEGORY_SUGGESTION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type CategorySuggestionStatus = (typeof CATEGORY_SUGGESTION_STATUSES)[number];

export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'processing',
  'completed',
  'cancelled',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const VENDOR_ORDER_STATUSES = [
  'awaiting_payment',
  'paid',
  'fulfilling',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;
export type VendorOrderStatus = (typeof VENDOR_ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'pending',
  'requires_action',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const TRANSFER_STATUSES = ['pending', 'paid', 'failed'] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export const COMMISSION_BPS_DEFAULT = 1000;

/** Platform commission in cents from item subtotal (shipping excluded). */
export function computeCommission(subtotalCents: number, commissionBps: number): number {
  return Math.floor((subtotalCents * commissionBps) / 10_000);
}
