import { Spinner } from '@/components/spinner';

type Props = {
  label?: string;
};

export function LoadingOverlay({ label = 'Updating…' }: Props) {
  return (
    <div
      className="absolute inset-0 z-10 flex items-start justify-center rounded-md bg-background/40 pt-16 backdrop-blur-[1px]"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-2 rounded-full border border-border bg-elevated px-4 py-2 text-sm text-muted shadow-sm">
        <Spinner size="sm" label={label} />
        <span>{label}</span>
      </div>
    </div>
  );
}
