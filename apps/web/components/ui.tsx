'use client';

import { forwardRef } from 'react';
import { cn } from '../lib/cn';

// ── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'ghost' | 'outline';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-signal text-ink hover:bg-[#ff6a33] active:translate-y-px disabled:bg-signal-dim disabled:text-paper/70',
  ghost: 'bg-transparent text-muted hover:text-paper hover:bg-ink-raised',
  outline: 'border border-line bg-ink-raised text-paper hover:border-faint',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold',
        'transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-signal/60',
        'disabled:cursor-not-allowed',
        VARIANT[variant],
        className,
      )}
      {...props}
    >
      {loading && <Spinner />}
      <span className={cn(loading && 'opacity-80')}>{children}</span>
    </button>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
      aria-hidden
    />
  );
}

// ── Text field ───────────────────────────────────────────────────────────────

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField(
  { label, hint, error, className, id, ...props },
  ref,
) {
  const fieldId = id ?? props.name;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
      <input
        ref={ref}
        id={fieldId}
        className={cn(
          'h-11 w-full rounded-lg border bg-ink-raised px-3.5 text-sm text-paper',
          'placeholder:text-faint transition-colors duration-150 outline-none',
          'focus:border-signal/70 focus:ring-2 focus:ring-signal/20',
          error ? 'border-signal/70' : 'border-line',
          className,
        )}
        {...props}
      />
      {error ? (
        <span className="mt-1.5 block text-xs text-signal">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-faint">{hint}</span>
      ) : null}
    </label>
  );
});

// ── Checkbox ─────────────────────────────────────────────────────────────────

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
}

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const fieldId = id ?? props.name;
  return (
    <label htmlFor={fieldId} className="flex cursor-pointer items-start gap-2.5 text-sm text-muted">
      <input
        id={fieldId}
        type="checkbox"
        className={cn(
          'mt-0.5 size-4 shrink-0 appearance-none rounded border border-line bg-ink-raised',
          'checked:border-signal checked:bg-signal',
          'bg-[length:12px] bg-center bg-no-repeat',
          "checked:bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 6.2l2.2 2.3 4.8-5' stroke='%230a0b0e' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")]",
          'outline-none focus-visible:ring-2 focus-visible:ring-signal/40',
          className,
        )}
        {...props}
      />
      <span className="leading-relaxed">{label}</span>
    </label>
  );
}

// ── Alert ────────────────────────────────────────────────────────────────────

export function Alert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'success' | 'info';
  children: React.ReactNode;
}) {
  const tones = {
    error: 'border-signal/40 text-signal',
    success: 'border-mint/40 text-mint',
    info: 'border-electric/40 text-electric',
  };
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('rounded-lg border bg-ink-raised px-3.5 py-3 text-sm', tones[tone])}
    >
      {children}
    </div>
  );
}

// ── Select ───────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, className, id, children, ...props },
  ref,
) {
  const fieldId = id ?? props.name;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
      <select
        ref={ref}
        id={fieldId}
        className={cn(
          'h-11 w-full rounded-lg border border-line bg-ink-raised px-3 text-sm text-paper',
          'outline-none transition-colors focus:border-signal/70 focus:ring-2 focus:ring-signal/20',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
});

// ── Badge ────────────────────────────────────────────────────────────────────

type BadgeTone = 'neutral' | 'success' | 'danger' | 'accent';

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: React.ReactNode }) {
  const tones: Record<BadgeTone, string> = {
    neutral: 'border-line text-muted',
    success: 'border-mint/40 text-mint',
    danger: 'border-signal/40 text-signal',
    accent: 'border-electric/40 text-electric',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-line bg-ink-raised', className)}>{children}</div>
  );
}
