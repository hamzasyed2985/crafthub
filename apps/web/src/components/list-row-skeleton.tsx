import { Skeleton } from '@/components/skeleton';

type Props = {
  rows?: number;
  columns?: number;
};

export function ListRowSkeleton({ rows = 5, columns = 4 }: Props) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading list">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-3 rounded-md border border-border bg-elevated/50 p-4">
          {Array.from({ length: columns }).map((__, col) => (
            <Skeleton
              key={col}
              className={`h-4 ${col === 0 ? 'w-1/4' : col === columns - 1 ? 'ml-auto w-16' : 'flex-1'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
