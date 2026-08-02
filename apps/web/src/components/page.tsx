import type { ReactNode } from 'react';
import { cn } from '@crafthub/ui';

export type PageSize = 'narrow' | 'reading' | 'default' | 'wide';

const sizeClass: Record<PageSize, string> = {
  narrow: 'max-w-lg',
  reading: 'max-w-3xl',
  default: 'max-w-5xl',
  wide: 'max-w-6xl',
};

const yClass = {
  sm: 'py-10',
  md: 'py-12',
  lg: 'py-16',
  none: '',
} as const;

export type PageY = keyof typeof yClass;

/**
 * Shared content shell: same gutters and vertical rhythm, width by page type.
 * - narrow: auth / profile / forms
 * - reading: orders, cart, detail lists
 * - default: dashboards, shop/product, checkout
 * - wide: explore / search grids
 */
export function Page({
  children,
  size = 'default',
  y = 'md',
  className,
}: {
  children: ReactNode;
  size?: PageSize;
  y?: PageY;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full px-6', sizeClass[size], yClass[y], className)}>
      {children}
    </div>
  );
}
