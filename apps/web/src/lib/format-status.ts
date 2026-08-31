import type { OrderStatus, VendorOrderStatus } from '@crafthub/shared';

/** Admin / vendor / generic API status (e.g. pending_payment → Pending Payment). */
export function formatStatusLabel(status: string | null | undefined): string {
  if (!status) return 'All';
  return status
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/** Buyer-facing whole-order status (avoid internal terms like Processing). */
export function formatBuyerOrderStatus(status: OrderStatus | string): string {
  switch (status as OrderStatus) {
    case 'pending_payment':
      return 'Awaiting payment';
    case 'paid':
      return 'Confirmed';
    case 'processing':
      return 'In progress';
    case 'completed':
      return 'Complete';
    case 'cancelled':
      return 'Cancelled';
    case 'refunded':
      return 'Refunded';
    default: {
      const _exhaustive: string = status;
      return formatStatusLabel(_exhaustive);
    }
  }
}

/**
 * Buyer-facing per-shop fulfillment status.
 * "paid" on a vendor slice means payment cleared — not "you still owe money".
 */
export function formatBuyerVendorSliceStatus(status: VendorOrderStatus | string): string {
  switch (status as VendorOrderStatus) {
    case 'awaiting_payment':
      return 'Awaiting payment';
    case 'paid':
      return 'Confirmed — preparing your order';
    case 'fulfilling':
      return 'Preparing your order';
    case 'shipped':
      return 'Shipped';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    case 'refunded':
      return 'Refunded';
    default: {
      const _exhaustive: string = status;
      return formatStatusLabel(_exhaustive);
    }
  }
}
