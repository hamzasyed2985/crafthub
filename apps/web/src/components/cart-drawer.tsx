'use client';

import Link from 'next/link';
import { Button, Price } from '@crafthub/ui';
import { useCart } from '@/components/cart-provider';

export function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, setItemQty, removeItem, loading } = useCart();

  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-[30]">
      <button
        type="button"
        aria-label="Close cart"
        className="absolute inset-0 bg-inverse/40 transition-opacity duration-150"
        onClick={closeDrawer}
      />
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-elevated shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-transform duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-xl">Cart</h2>
          <Button variant="ghost" size="sm" onClick={closeDrawer}>
            Close
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && !cart ? <p className="text-subtle">Loading…</p> : null}
          {cart?.warnings?.map((w) => (
            <p key={w.message} className="mb-3 rounded-md bg-accent-muted px-3 py-2 text-sm">
              {w.message}
            </p>
          ))}
          {!cart || cart.itemCount === 0 ? (
            <div className="py-10 text-center">
              <p className="text-muted">Your cart is empty.</p>
              <Link href="/explore" onClick={closeDrawer} className="mt-3 inline-block text-accent">
                Explore makers
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {cart.groups.map((group) => (
                <section key={group.vendor.id}>
                  <Link
                    href={`/shops/${group.vendor.slug}`}
                    onClick={closeDrawer}
                    className="font-semibold hover:text-accent"
                  >
                    {group.vendor.displayName}
                  </Link>
                  <ul className="mt-3 space-y-4">
                    {group.items.map((item) => (
                      <li key={item.id} className="flex gap-3">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt=""
                            className="h-16 w-16 rounded object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded bg-background-subtle" />
                        )}
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/shops/${group.vendor.slug}/products/${item.product.slug}`}
                            onClick={closeDrawer}
                            className="block truncate font-medium"
                          >
                            {item.product.title}
                          </Link>
                          <p className="text-sm text-muted">
                            <Price cents={item.variant.priceCents} />
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              className="min-h-9 min-w-9 rounded border border-border"
                              onClick={() =>
                                void setItemQty(item.id, Math.max(0, item.quantity - 1))
                              }
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-sm">{item.quantity}</span>
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
                              className="ml-auto text-sm text-subtle hover:text-danger"
                              onClick={() => void removeItem(item.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 space-y-1 text-sm text-muted">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <Price cents={group.subtotalCents} />
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <Price cents={group.shippingCents} />
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {cart && cart.itemCount > 0 ? (
          <div className="border-t border-border px-5 py-4">
            <div className="mb-3 flex justify-between font-semibold">
              <span>Total</span>
              <Price cents={cart.totalCents} />
            </div>
            <Link href="/cart" onClick={closeDrawer}>
              <Button className="w-full">View cart</Button>
            </Link>
            <p className="mt-2 text-center text-xs text-subtle">Checkout comes in Phase 3</p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
