'use client';

import { useId } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Textarea({ label, hint, error, id, className, ...props }: TextareaProps) {
  const reactId = useId();
  const textareaId = id ?? props.name ?? reactId;

  return (
    <label className="flex w-full flex-col gap-1.5 font-sans">
      {label ? <span className="text-sm font-semibold text-foreground">{label}</span> : null}
      <textarea
        id={textareaId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
        className={cn(
          'min-h-28 w-full rounded-sm border bg-elevated px-3 py-2.5 font-sans text-base text-foreground',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          error ? 'border-danger' : 'border-border-strong',
          className,
        )}
        {...props}
      />
      {error ? (
        <span id={`${textareaId}-error`} className="text-sm text-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={`${textareaId}-hint`} className="text-sm text-subtle">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
