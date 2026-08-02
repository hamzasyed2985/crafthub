'use client';

import Link from 'next/link';
import { Button, Price } from '@crafthub/ui';
import { useCart } from '@/components/cart-provider';

export default function CartPage() {
  const { cart, loading, error, setItemQty, removeItem, empty } = useCart();

  if (loading && !cart) {
    return <p className="px-6 py-12 text-subtle">Loading cart…</p>;
  }

  if (error) {
    return <p className="px-6 py-12 text-danger">{error}</p>;
  }

  if (!cart || cart.itemCount === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="font-display text-3xl">Your cart</h1>
        <p className="mt-3 text-muted">Nothing here yet.</p>
        <Link href="/explore" className="mt-6 inline-block">
          <Button>Explore makers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl">Your cart</h1>
        <Button variant="ghost" size="sm" onClick={() => void empty()}>
          Clear
        </Button>
      </div>

      {cart.warnings.map((w) => (
        <p key={w.message} className="mt-4 rounded-md bg-accent-muted px-3 py-2 text-sm">
          {w.message}
        </p>
      ))}

      <div className="mt-8 space-y-10">
        {cart.groups.map((group) => (
          <section key={group.vendor.id} className="border-b border-border pb-8">
            <Link href={`/shops/${group.vendor.slug}`} className="font-display text-2xl hover:text-accent">
              {group.vendor.displayName}
            </Link>
            <p className="text-sm text-subtle">
              Ships from {group.shop.shipsFromCity ?? 'the maker'}
            </p>
            <ul className="mt-4 space-y-4">
              {group.items.map((item) => (
                <li key={item.id} className="flex gap-4">
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt=""
                      className="h-20 w-20 rounded object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded bg-background-subtle" />
                  )}
                  <div className="flex-1">
                    <Link
                      href={`/shops/${group.vendor.slug}/products/${item.product.slug}`}
                      className="font-semibold hover:text-accent"
                    >
                      {item.product.title}
                    </Link>
                    <p className="text-sm text-muted">
                      <Price cents={item.variant.priceCents} /> each · {item.variant.stockQty}{' '}
                      available
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="min-h-9 min-w-9 rounded border border-border"
                        onClick={() => void setItemQty(item.id, Math.max(0, item.quantity - 1))}
                      >
                        −
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        className="min-h-9 min-w-9 rounded border border-border"
                        disabled={item.quantity >= item.variant.stockQty}
                        onClick={() => void setItemQty(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="ml-4 text-sm text-subtle hover:text-danger"
                        onClick={() => void removeItem(item.id)}
                      >
                        Remove
                      </button>
                      <span className="ml-auto font-semibold">
                        <Price cents={item.lineTotalCents} />
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between text-muted">
                <span>Vendor subtotal</span>
                <Price cents={group.subtotalCents} />
              </div>
              <div className="flex justify-between text-muted">
                <span>Shipping</span>
                <Price cents={group.shippingCents} />
              </div>
              <div className="flex justify-between font-semibold">
                <span>Vendor total</span>
                <Price cents={group.vendorTotalCents} />
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-6 space-y-2 rounded-md border border-border bg-elevated p-4">
        <div className="flex justify-between text-muted">
          <span>Items</span>
          <Price cents={cart.itemsSubtotalCents} />
        </div>
        <div className="flex justify-between text-muted">
          <span>Shipping</span>
          <Price cents={cart.shippingTotalCents} />
        </div>
        <div className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <Price cents={cart.totalCents} />
        </div>
        <Link href="/checkout">
          <Button className="mt-4 w-full">Checkout</Button>
        </Link>
      </div>
    </div>
  );
}
