'use client';

import { useState } from 'react';
import { Button } from '@crafthub/ui';
import { useCart } from '@/components/cart-provider';

export function AddToCartButton({
  variantId,
  stockQty,
  disabled,
  disabledLabel,
}: {
  variantId: string;
  stockQty: number;
  disabled?: boolean;
  disabledLabel?: string;
}) {
  const { addItem } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const soldOut = stockQty <= 0;
  const blocked = soldOut || Boolean(disabled);

  async function onAdd() {
    setLoading(true);
    setError(null);
    try {
      await addItem(variantId, 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to cart');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8">
      <Button onClick={() => void onAdd()} loading={loading} disabled={blocked}>
        {soldOut ? 'Sold out' : disabled && disabledLabel ? disabledLabel : 'Add to cart'}
      </Button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
