'use client';
import React from 'react';

// ── Shared primitive components ───────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium text-base min-h-[44px] px-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-[var(--color-accent)] text-white hover:bg-[#174F76] active:bg-[#0F3A5A]',
    secondary:
      'border border-[var(--color-border)] bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)] active:bg-[#E0E8EE]',
    destructive:
      'bg-[var(--color-danger)] text-white hover:bg-[#7A1414] active:bg-[#5E0F0F]',
    ghost:
      'bg-transparent text-[var(--color-accent)] hover:bg-[var(--color-surface-sunken)] active:bg-[#D0E5F5]',
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      aria-disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, id, className = '', ...rest }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-ink)]">
        {label}
      </label>
      {hint && (
        <p id={`${inputId}-hint`} className="text-xs text-[var(--color-ink-muted)]">
          {hint}
        </p>
      )}
      <input
        id={inputId}
        aria-describedby={hint ? `${inputId}-hint` : error ? `${inputId}-error` : undefined}
        aria-invalid={!!error}
        className={`min-h-[44px] rounded-lg border px-4 py-2 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 ${
          error
            ? 'border-[var(--color-danger)]'
            : 'border-[var(--color-border)]'
        } ${className}`}
        {...rest}
      />
      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-sm text-[var(--color-danger)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function ScreenHeader({
  title,
  back,
  right,
}: {
  title: string;
  back?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 h-14 border-b border-[var(--color-border)] sticky top-0 bg-white z-10">
      <div className="w-10">{back}</div>
      <h1 className="text-lg font-semibold text-[var(--color-ink)] truncate">{title}</h1>
      <div className="w-10 flex justify-end">{right}</div>
    </header>
  );
}

export function LockBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-muted)] bg-[var(--color-surface-sunken)] px-2 py-0.5 rounded-full"
      aria-label="Private — only you and your planner see this"
    >
      <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true" fill="currentColor">
        <path d="M8 5H7V3.5a2.5 2.5 0 0 0-5 0V5H1a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1ZM4 3.5a1 1 0 0 1 2 0V5H4V3.5Zm1 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
      </svg>
      Only you &amp; your planner
    </span>
  );
}

export function BalanceChip({ status }: { status: 'blocked' | 'owed' | 'pending' | 'paid' | 'failed' }) {
  const labels: Record<typeof status, string> = {
    blocked: 'Blocked',
    owed: 'Owed',
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
  };
  return (
    <span className={`chip chip--${status}`} role="status" aria-label={`Balance status: ${labels[status]}`}>
      {labels[status]}
    </span>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${current} of ${total}`} role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i + 1 <= current
              ? 'bg-[var(--color-accent)] w-6'
              : 'bg-[var(--color-border)] w-3'
          }`}
        />
      ))}
    </div>
  );
}

export function BackButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)] -ml-1"
      aria-label="Go back"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 16l-6-6 6-6" />
      </svg>
    </a>
  );
}

export function PlannerCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border)] p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white text-xs font-bold" aria-hidden="true">AI</div>
        <span className="text-sm font-medium text-[var(--color-ink-muted)]">Planner</span>
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ icon, heading, body, action }: { icon?: string; heading: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[200px]">
      {icon && <span className="text-4xl" aria-hidden="true">{icon}</span>}
      <h2 className="text-lg font-semibold text-[var(--color-ink)]">{heading}</h2>
      <p className="text-sm text-[var(--color-ink-muted)] max-w-[280px]">{body}</p>
      {action}
    </div>
  );
}

export function SandboxBanner() {
  return (
    <aside
      className="bg-[#FFF3CD] border-b border-[#F0C040] px-4 py-2 text-xs text-[#7A5500] text-center"
      role="note"
      aria-label="Demo notice"
    >
      Demo — fictional people and synthetic data. No real payments or bookings.
    </aside>
  );
}
