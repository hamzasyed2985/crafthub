'use client';

import { IconGridDensity } from '@/components/icons';
import { Spinner } from '@/components/spinner';

type GridCols = 3 | 4 | 5;

const GRID_OPTIONS: Array<{ cols: GridCols; label: string }> = [
  { cols: 3, label: 'Comfortable grid' },
  { cols: 4, label: 'Standard grid' },
  { cols: 5, label: 'Compact grid' },
];

type Props = {
  gridCols: GridCols;
  onGridColsChange: (cols: GridCols) => void;
  total: number;
  initialLoading?: boolean;
  refreshing?: boolean;
  hasFilters?: boolean;
  onClearFilters?: () => void;
};

export function CatalogViewToolbar({
  gridCols,
  onGridColsChange,
  total,
  initialLoading,
  refreshing,
  hasFilters,
  onClearFilters,
}: Props) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted">
          {initialLoading ? (
            <>
              <Spinner size="sm" label="Loading items" />
              <span>Loading items…</span>
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">{total}</span>
              {total === 1 ? ' item' : ' items'}
              {refreshing ? (
                <Spinner size="sm" label="Updating results" className="ml-1" />
              ) : null}
            </>
          )}
        </div>
        {hasFilters && onClearFilters ? (
          <button
            type="button"
            className="text-accent hover:underline"
            onClick={onClearFilters}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div
        className="inline-flex items-center rounded-md border border-border bg-elevated p-0.5"
        role="group"
        aria-label="Grid density"
      >
        {GRID_OPTIONS.map(({ cols, label }) => {
          const active = gridCols === cols;
          return (
            <button
              key={cols}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={active}
              onClick={() => onGridColsChange(cols)}
              className={`inline-flex h-8 w-9 items-center justify-center rounded-[5px] transition-colors ${
                active
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <IconGridDensity columns={cols} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
