'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  addCartItem,
  clearCart,
  fetchCart,
  removeCartItem,
  updateCartItem,
  type CartDto,
} from '@/lib/api';

type CartContextValue = {
  cart: CartDto | null;
  loading: boolean;
  error: string | null;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  refresh: () => Promise<void>;
  addItem: (variantId: string, qty?: number) => Promise<void>;
  setItemQty: (itemId: string, qty: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  empty: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

const emptyCart = (): CartDto => ({
  id: '',
  itemCount: 0,
  currency: 'USD',
  groups: [],
  itemsSubtotalCents: 0,
  shippingTotalCents: 0,
  totalCents: 0,
  warnings: [],
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchCart();
      setCart(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cart failed');
      setCart(emptyCart());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (variantId: string, qty = 1) => {
      const next = await addCartItem(variantId, qty);
      setCart(next);
      setDrawerOpen(true);
    },
    [],
  );

  const setItemQty = useCallback(async (itemId: string, qty: number) => {
    const next = await updateCartItem(itemId, qty);
    setCart(next);
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    const next = await removeCartItem(itemId);
    setCart(next);
  }, []);

  const empty = useCallback(async () => {
    const next = await clearCart();
    setCart(next);
  }, []);

  const value = useMemo(
    () => ({
      cart,
      loading,
      error,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      refresh,
      addItem,
      setItemQty,
      removeItem,
      empty,
    }),
    [cart, loading, error, drawerOpen, refresh, addItem, setItemQty, removeItem, empty],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
