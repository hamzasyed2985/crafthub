import type { InputHTMLAttributes } from 'react';
import { cn } from './cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Input({ label, hint, error, id, className, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="flex w-full flex-col gap-1.5 font-sans">
      {label ? <span className="text-sm font-semibold text-foreground">{label}</span> : null}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(
          'min-h-11 w-full rounded-sm border bg-elevated px-3 py-2.5 font-sans text-base text-foreground',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          error ? 'border-danger' : 'border-border-strong',
          className,
        )}
        {...props}
      />
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
