'use client';
import React, { useEffect } from 'react';

// WCAG 2.4.2: every screen names itself in the document title.
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Unspoken`;
  }, [title]);
}

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
    'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium text-base min-h-[48px] px-5 transition-colors disabled:bg-[var(--color-action-disabled)] disabled:text-[var(--color-on-action-disabled)] disabled:border-transparent disabled:cursor-not-allowed';
  // Ink actions; PayPal blue never fills a button (DESIGN_SYSTEM: Colour).
  // Confirm and Cancel carry equal weight in money and destructive steps.
  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-[var(--color-action)] text-[var(--color-on-action)] active:bg-[var(--color-action-pressed)]',
    secondary:
      'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] active:bg-[var(--color-surface-sunken)]',
    destructive:
      'border border-[var(--color-status-failed)] bg-[var(--color-surface)] text-[var(--color-status-failed)] active:bg-[var(--color-status-failed-surface)]',
    ghost:
      'bg-transparent text-[var(--color-ink)] underline underline-offset-4 active:bg-[var(--color-surface-sunken)]',
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

export function Input({
  label,
  hint,
  error,
  id,
  className = '',
  ...rest
}: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-[var(--color-ink)]"
      >
        {label}
      </label>
      {hint && (
        <p
          id={`${inputId}-hint`}
          className="text-xs text-[var(--color-ink-muted)]"
        >
          {hint}
        </p>
      )}
      <input
        id={inputId}
        aria-describedby={
          hint ? `${inputId}-hint` : error ? `${inputId}-error` : undefined
        }
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
  useDocumentTitle(title);
  return (
    <header className="flex items-center justify-between gap-3 px-4 h-14 border-b border-[var(--color-border)] sticky top-0 bg-white z-10">
      <div className="w-10">{back}</div>
      <h1 className="text-lg font-semibold text-[var(--color-ink)] truncate">
        {title}
      </h1>
      <div className="w-10 flex justify-end">{right}</div>
    </header>
  );
}

export function LockBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-private)] bg-[var(--color-private-surface)] px-2 py-0.5 rounded-full">
      <svg
        width="10"
        height="12"
        viewBox="0 0 10 12"
        aria-hidden="true"
        fill="currentColor"
      >
        <path d="M8 5H7V3.5a2.5 2.5 0 0 0-5 0V5H1a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1ZM4 3.5a1 1 0 0 1 2 0V5H4V3.5Zm1 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
      </svg>
      Only you and your planner see this
    </span>
  );
}

export function BalanceChip({
  status,
}: {
  status: 'blocked' | 'owed' | 'pending' | 'paid' | 'failed';
}) {
  const labels: Record<typeof status, string> = {
    blocked: 'Blocked',
    owed: 'Owed',
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
  };
  return <span className={`chip chip--${status}`}>{labels[status]}</span>;
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </div>
  );
}

export function StepIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div
      className="flex items-center gap-1.5"
      aria-label={`Step ${current} of ${total}`}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
    >
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
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 16l-6-6 6-6" />
      </svg>
    </a>
  );
}

export function PlannerCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-card)] p-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white text-xs font-bold"
          aria-hidden="true"
        >
          AI
        </div>
        <span className="text-sm font-medium text-[var(--color-ink-muted)]">
          Planner
        </span>
      </div>
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  heading,
  body,
  action,
}: {
  icon?: string;
  heading: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[200px]">
      {icon ? (
        <span className="text-4xl" aria-hidden="true">
          {icon}
        </span>
      ) : (
        <svg
          width="96"
          height="64"
          viewBox="0 0 96 64"
          aria-hidden="true"
          fill="none"
          stroke="var(--color-paypal-line)"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M20 44c-8-2-12-10-8-17s14-8 19-3c3-9 15-12 22-6 6-4 16-1 17 8 8 0 13 8 9 15s-12 7-15 5c-4 6-14 7-19 2-6 4-17 2-19-4" />
          <circle cx="30" cy="56" r="3" />
          <circle cx="66" cy="56" r="3" />
        </svg>
      )}
      <h2 className="text-lg font-semibold text-[var(--color-ink)]">
        {heading}
      </h2>
      <p className="text-sm text-[var(--color-ink-muted)] max-w-[280px]">
        {body}
      </p>
      {action}
    </div>
  );
}

export function SandboxBanner() {
  return (
    <aside
      className="notice border-b border-[var(--color-hairline)] px-4 py-2 text-sm text-center"
      role="note"
      aria-label="Demo notice"
    >
      Sandbox — no real money. Demo people and a simulated booking.
    </aside>
  );
}
