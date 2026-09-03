import { Spinner } from '@/components/spinner';

type Props = {
  label?: string;
  className?: string;
};

export function LoadingMessage({ label = 'Loading…', className }: Props) {
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2.5 text-sm text-subtle ${className ?? ''}`}
    >
      <Spinner size="sm" label={label} />
      <span>{label}</span>
    </span>
  );
}
