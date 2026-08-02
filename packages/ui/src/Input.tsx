'use client';

import { useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from './cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    // Eye-off: password currently visible
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A9.8 9.8 0 0112 5c5 0 9.3 3.1 11 7-.5 1.2-1.2 2.3-2.1 3.2M6.1 6.1C4.2 7.4 2.7 9.1 2 12c1.7 3.9 6 7 10 7 1.4 0 2.8-.3 4-.8"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function Input({ label, hint, error, id, className, type, ...props }: InputProps) {
  const reactId = useId();
  const inputId = id ?? props.name ?? reactId;
  const isPassword = type === 'password';
  const [visible, setVisible] = useState(false);
  const inputType = isPassword ? (visible ? 'text' : 'password') : type;

  return (
    <label className="flex w-full flex-col gap-1.5 font-sans">
      {label ? <span className="text-sm font-semibold text-foreground">{label}</span> : null}
      <span className="relative block w-full">
        <input
          id={inputId}
          type={inputType}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            'min-h-11 w-full rounded-sm border bg-elevated px-3 py-2.5 font-sans text-base text-foreground',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            error ? 'border-danger' : 'border-border-strong',
            isPassword ? 'pr-11' : null,
            className,
          )}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            tabIndex={0}
            className="absolute right-2 top-1/2 inline-flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-sm text-subtle hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          >
            <EyeIcon open={visible} />
          </button>
        ) : null}
      </span>
      {error ? (
        <span id={`${inputId}-error`} className="text-sm text-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="text-sm text-subtle">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
