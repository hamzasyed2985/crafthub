import type { InputHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Input({
  label,
  hint,
  error,
  id,
  style,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        fontFamily: 'var(--font-body)',
        width: '100%',
      }}
    >
      {label ? (
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg)' }}>{label}</span>
      ) : null}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
        style={{
          width: '100%',
          minHeight: 44,
          padding: '0.625rem 0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border-strong)'}`,
          background: 'var(--bg-elevated)',
          color: 'var(--fg)',
          fontFamily: 'var(--font-body)',
          fontSize: '1rem',
          ...style,
        }}
        {...props}
      />
      {error ? (
        <span id={`${inputId}-error`} style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} style={{ fontSize: '0.875rem', color: 'var(--fg-subtle)' }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}
