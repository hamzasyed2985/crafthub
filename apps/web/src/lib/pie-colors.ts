/**
 * Muted clay / linen chart palette — readable in light and dark,
 * avoids neon CSS-status clash on pie slices.
 */
export const PIE_COLORS = [
  '#c45c3a', // clay
  '#5a7d68', // moss
  '#b08968', // warm tan
  '#6b7280', // slate
  '#8b6914', // ochre
  '#7c6f64', // stone
  '#9a6b5a', // dusty rose-clay
  '#4a6670', // blue-gray
] as const;

export const PIE_SEMANTIC = {
  accent: '#c45c3a',
  positive: '#5a7d68',
  caution: '#b08968',
  muted: '#6b7280',
  debt: '#9a6b5a',
} as const;

export function pieColorAt(index: number): string {
  return PIE_COLORS[index % PIE_COLORS.length]!;
}
