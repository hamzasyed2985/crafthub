import { Skeleton } from '@/components/skeleton';

export function AccountAvatarSkeleton() {
  return (
    <span
      className="inline-flex min-h-9 min-w-9 items-center justify-center"
      aria-label="Loading account"
      role="status"
    >
      <Skeleton className="h-8 w-8 rounded-full" />
    </span>
  );
}

export function AccountMenuSkeleton() {
  return (
    <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading account menu">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-5 w-full" />
      <div className="space-y-1.5 pt-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}
