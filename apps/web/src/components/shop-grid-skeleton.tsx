import { Skeleton } from '@/components/skeleton';

type Props = {
  count?: number;
};

export function ShopGridSkeleton({ count = 6 }: Props) {
  return (
    <ul
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading makers"
    >
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="rounded-md border border-border bg-elevated/50 p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
