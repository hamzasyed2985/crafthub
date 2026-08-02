'use client';

type Props = {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function PaginationControls({ page, limit, total, onPageChange }: Props) {
  const pageCount = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  if (total <= limit) return null;

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-sm">
      <p className="text-subtle">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="text-muted">
          Page {page} / {pageCount}
        </span>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
