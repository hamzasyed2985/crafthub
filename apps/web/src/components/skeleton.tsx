import { cn } from '@crafthub/ui';

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-background-subtle', className)}
      aria-hidden
    />
  );
}
