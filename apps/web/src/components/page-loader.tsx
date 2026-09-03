import { Spinner } from '@/components/spinner';

type Props = {
  label?: string;
};

export function PageLoader({ label = 'Loading…' }: Props) {
  return (
    <div className="flex min-h-[14rem] flex-col items-center justify-center gap-3 py-16">
      <Spinner size="lg" label={label} />
      <p className="text-sm text-subtle">{label}</p>
    </div>
  );
}
