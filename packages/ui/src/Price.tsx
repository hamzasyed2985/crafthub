export function formatMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export type PriceProps = {
  cents: number;
  currency?: string;
  className?: string;
};

export function Price({ cents, currency = 'USD', className }: PriceProps) {
  return <span className={className ?? 'text-price font-semibold'}>{formatMoney(cents, currency)}</span>;
}
