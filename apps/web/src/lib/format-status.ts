/** Display label for API status values (e.g. pending_payment → Pending Payment). */
export function formatStatusLabel(status: string | null | undefined): string {
  if (!status) return 'All';
  return status
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
