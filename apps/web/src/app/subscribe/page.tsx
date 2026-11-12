'use client';
// P3 — Subscription
// $15/month plan details. Free trial and who pays are open (section 12).
import { Button } from '@/components/ui';

const FEATURES = [
  'AI planner finds and suggests plans in NYC',
  'Group polls for activities and times',
  'Booking with your explicit approval',
  'PayPal splitting between friends',
];

export default function SubscribePage() {
  return (
    <main className="flex flex-col min-h-dvh px-6 pt-12 pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-ink)]">Start planning together</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Unspoken is <strong>$15 a month</strong>. Billed through the app store.
        </p>
      </div>

      <ul className="flex flex-col gap-4 mb-8" role="list" aria-label="What's included">
        {FEATURES.map(f => (
          <li key={f} className="flex items-start gap-3 text-sm text-[var(--color-ink)]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              aria-hidden="true"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 mt-0.5"
            >
              <path d="M4 10l5 5 7-7" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <div className="rounded-2xl bg-[var(--color-surface-sunken)] border border-[var(--color-border)] p-4 mb-6 text-sm text-[var(--color-ink-muted)]">
        <strong className="text-[var(--color-ink)]">Note:</strong> The $15 subscription covers the
        planner service. Hangout money moves between friends through PayPal — the app never holds
        your funds. This is a demo; no charge is made.
      </div>

      <div className="flex flex-col gap-3 mt-auto">
        <Button fullWidth onClick={() => { window.location.href = '/profile/create'; }}>
          Start $15/month plan
        </Button>
        <Button variant="ghost" fullWidth onClick={() => { window.location.href = '/profile/create'; }}>
          Restore purchase
        </Button>
      </div>
    </main>
  );
}
