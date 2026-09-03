'use client';

import { useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from './cn';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Select({ label, hint, error, id, className, children, ...props }: SelectProps) {
  const reactId = useId();
  const selectId = id ?? props.name ?? reactId;

  return (
    <label className="flex w-full flex-col gap-1.5 font-sans">
      {label ? <span className="text-sm font-semibold text-foreground">{label}</span> : null}
      <span className="relative block w-full">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          className={cn(
            'min-h-11 w-full appearance-none rounded-sm border bg-elevated py-2.5 pl-3 pr-10 font-sans text-base text-foreground',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            error ? 'border-danger' : 'border-border-strong',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle">
          <ChevronIcon />
        </span>
      </span>
      {error ? (
        <span id={`${selectId}-error`} className="text-sm text-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={`${selectId}-hint`} className="text-sm text-subtle">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
