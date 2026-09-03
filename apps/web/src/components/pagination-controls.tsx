'use client';

import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  IconChevronDoubleLeft,
  IconChevronDoubleRight,
  IconChevronLeft,
  IconChevronRight,
} from '@/components/icons';

type Props = {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (limit: number) => void;
  /** @deprecated Always on — kept for call-site compatibility. */
  showPageJump?: boolean;
  /** @deprecated Always on — kept for call-site compatibility. */
  showFirstLast?: boolean;
  /** @deprecated Always catalog style — kept for call-site compatibility. */
  variant?: 'default' | 'catalog';
};

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

function PageNavButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-background-subtle hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

export function PaginationControls({
  page,
  limit,
  total,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}: Props) {
  const pageCount = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  const [jumpInput, setJumpInput] = useState(String(page));

  useEffect(() => {
    setJumpInput(String(page));
  }, [page]);

  const hasPageSize = Boolean(pageSizeOptions?.length && onPageSizeChange);
  const needsNav = total > limit || hasPageSize;

  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  function handlePageChange(next: number) {
    if (next !== page) {
      scrollToTop();
      onPageChange(next);
    }
  }

  function handlePageSizeChange(next: number) {
    if (next !== limit) {
      scrollToTop();
      onPageSizeChange?.(next);
    }
  }

  function goToPage(raw: string) {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) {
      setJumpInput(String(page));
      return;
    }
    const next = Math.min(pageCount, Math.max(1, parsed));
    handlePageChange(next);
    setJumpInput(String(next));
  }

  function onJumpKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      goToPage(jumpInput);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted">
        <span className="text-foreground">
          {from}&ndash;{to}
        </span>{' '}
        of <span className="text-foreground">{total}</span>
      </p>

      {needsNav ? (
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          {hasPageSize ? (
            <label className="flex items-center gap-2 text-sm text-muted">
              <span className="whitespace-nowrap">Rows per page</span>
              <select
                className="h-8 min-w-[4.5rem] rounded-md border border-border-strong bg-elevated pl-2 pr-7 text-sm text-foreground"
                value={limit}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                aria-label="Rows per page"
              >
                {pageSizeOptions?.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <nav
            className="inline-flex items-center gap-0.5 rounded-md border border-border bg-elevated px-1 py-0.5"
            aria-label="Pagination"
          >
            <PageNavButton disabled={page <= 1} onClick={() => handlePageChange(1)} label="First page">
              <IconChevronDoubleLeft className="h-4 w-4" />
            </PageNavButton>

            <PageNavButton
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              label="Previous page"
            >
              <IconChevronLeft className="h-4 w-4" />
            </PageNavButton>

            <span className="flex items-center gap-1 px-1.5 text-sm text-muted">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value.replace(/\D/g, ''))}
                onBlur={() => goToPage(jumpInput)}
                onKeyDown={onJumpKeyDown}
                aria-label="Current page"
                className="h-7 w-9 rounded border border-border-strong bg-background text-center text-sm text-foreground tabular-nums focus:border-accent focus:outline-none"
              />
              <span className="whitespace-nowrap tabular-nums">/ {pageCount}</span>
            </span>

            <PageNavButton
              disabled={page >= pageCount}
              onClick={() => handlePageChange(page + 1)}
              label="Next page"
            >
              <IconChevronRight className="h-4 w-4" />
            </PageNavButton>

            <PageNavButton
              disabled={page >= pageCount}
              onClick={() => handlePageChange(pageCount)}
              label="Last page"
            >
              <IconChevronDoubleRight className="h-4 w-4" />
            </PageNavButton>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
