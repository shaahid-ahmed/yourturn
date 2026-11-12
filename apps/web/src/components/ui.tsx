'use client';
import React, { useEffect } from 'react';

// WCAG 2.4.2: every screen names itself in the document title.
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · HeyPal`;
  }, [title]);
}

// ── Shared primitive components (HeyPal restyle, same props) ────────────────

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
    'inline-flex items-center justify-center gap-2 rounded-full font-bold text-base min-h-[48px] px-5 transition-all active:scale-[0.96] disabled:cursor-not-allowed';
  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-[var(--deep)] text-[var(--mist)] uppercase text-[20px] px-[23px] disabled:bg-[var(--color-action-disabled)] disabled:text-[var(--color-on-action-disabled)]',
    secondary:
      'border-2 border-dotted border-[var(--blue-mid)] bg-transparent text-[var(--ink)] disabled:border-[var(--color-action-disabled)] disabled:text-[var(--color-on-action-disabled)]',
    destructive:
      'border border-[var(--color-status-failed)] bg-[var(--color-surface)] text-[var(--color-status-failed)] active:bg-[var(--color-status-failed-surface)] normal-case font-medium',
    ghost:
      'bg-transparent underline underline-offset-4 normal-case font-medium px-4 disabled:text-[var(--color-ink-muted)]',
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
        className="text-sm font-medium text-[var(--ink)]"
      >
        {label}
      </label>
      {hint && (
        <p id={`${inputId}-hint`} className="text-xs text-[var(--ink-muted)]">
          {hint}
        </p>
      )}
      <input
        id={inputId}
        aria-describedby={
          hint ? `${inputId}-hint` : error ? `${inputId}-error` : undefined
        }
        aria-invalid={!!error}
        className={`min-h-[44px] rounded-2xl border-2 px-4 py-2 text-base focus:outline-none ${
          error ? 'border-[var(--color-danger)]' : 'border-[var(--sky)]'
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
    <header className="flex items-center justify-between gap-3 px-4 h-14 border-b border-[var(--sky)] sticky top-0 bg-[var(--white)] z-10">
      <div className="w-10">{back}</div>
      <h1 className="text-lg font-bold text-[var(--ink)] truncate">{title}</h1>
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
      className={`hey-card border border-[var(--sky)] bg-[var(--white)] p-4 ${className}`}
    >
      {children}
    </div>
  );
}

// DotProgress: a row of dots where finished steps fill and the current
// one is larger. Replaces the bar StepIndicator, same props.
export function StepIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`Step ${current} of ${total}`}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="rounded-full transition-all"
          style={{
            width: i + 1 === current ? 14 : 9,
            height: i + 1 === current ? 14 : 9,
            background: i + 1 <= current ? 'var(--blue-mid)' : 'var(--sky)',
          }}
        />
      ))}
    </div>
  );
}

export function BackButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center w-10 h-10 rounded-full text-current"
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
    <div className={`hey-card bg-[var(--pale)] p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-full bg-[var(--orange)] flex items-center justify-center text-[var(--ink)] text-xs font-bold"
          aria-hidden="true"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 1l1.8 4.6L14 7l-4.2 1.4L8 13l-1.8-4.6L2 7l4.2-1.4L8 1z" />
          </svg>
        </div>
        <span className="text-sm font-medium text-[var(--ink-muted)]">
          Planner
        </span>
      </div>
      {children}
    </div>
  );
}

export function EmptyState({
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
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        aria-hidden="true"
        fill="var(--blue-mid)"
      >
        <circle cx="18" cy="24" r="4" />
        <circle cx="34" cy="16" r="5" />
        <circle cx="50" cy="22" r="3.5" />
        <circle cx="26" cy="40" r="5" />
        <circle cx="44" cy="38" r="4" />
        <circle cx="58" cy="36" r="5" />
        <circle cx="20" cy="56" r="3.5" />
        <circle cx="38" cy="54" r="4.5" />
        <circle cx="54" cy="54" r="3" />
      </svg>
      <h2 className="text-lg font-bold text-[var(--ink)]">{heading}</h2>
      <p className="text-sm text-[var(--ink-muted)] max-w-[280px]">{body}</p>
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
      Sandbox, no real money. Demo people and a simulated booking.
    </aside>
  );
}
