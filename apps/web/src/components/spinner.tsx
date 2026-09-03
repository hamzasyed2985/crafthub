import { cn } from '@crafthub/ui';

type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
};

const sizeClass = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
} as const;

export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-block shrink-0', className)}
    >
      <span
        className={cn(
          'block animate-spin rounded-full border-accent/30 border-t-accent',
          sizeClass[size],
        )}
      />
    </span>
  );
}
