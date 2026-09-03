import { Skeleton } from '@/components/skeleton';

type GridCols = 3 | 4 | 5;

const GRID_CLASS: Record<GridCols, string> = {
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
};

type Props = {
  count?: number;
  cols?: GridCols;
};

export function ProductGridSkeleton({ count = 8, cols = 4 }: Props) {
  return (
    <div
      className={`grid gap-4 sm:gap-5 ${GRID_CLASS[cols]}`}
      aria-busy="true"
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-[4/5] w-full rounded-md" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      ))}
    </div>
  );
}
