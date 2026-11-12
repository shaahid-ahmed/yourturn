'use client';
// P15 — Money page
// Two totals at top (owe / owed), then list by hangout and pod.
// Balances computed from append-only ledger, never stored as mutable sums.
import {
  ScreenHeader,
  BackButton,
  Card,
  BalanceChip,
  SandboxBanner,
} from '@/components/ui';

type BalanceStatus = 'owed' | 'pending' | 'paid' | 'failed';

interface HangoutBalance {
  hangoutId: string;
  podName: string;
  hangoutName: string;
  date: string;
  youOwe: number | null;
  youAreOwed: number | null;
  status: BalanceStatus;
}

const BALANCES: HangoutBalance[] = [
  {
    hangoutId: 'h1',
    podName: 'Friday crew',
    hangoutName: 'Brooklyn Bowl',
    date: 'Nov 20',
    youOwe: 3500,
    youAreOwed: null,
    status: 'owed',
  },
  {
    hangoutId: 'h2',
    podName: 'Work pals',
    hangoutName: 'Superiority Burger',
    date: 'Nov 18',
    youOwe: null,
    youAreOwed: 2000,
    status: 'pending',
  },
  {
    hangoutId: 'h3',
    podName: 'Friday crew',
    hangoutName: 'The High Line',
    date: 'Nov 7',
    youOwe: null,
    youAreOwed: null,
    status: 'paid',
  },
];

function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function MoneyPage() {
  const totalOwe = BALANCES.reduce((s, b) => s + (b.youOwe ?? 0), 0);
  const totalOwed = BALANCES.reduce((s, b) => s + (b.youAreOwed ?? 0), 0);

  return (
    <main className="flex flex-col min-h-dvh">
      <SandboxBanner />
      <ScreenHeader title="Money" back={<BackButton href="/home" />} />

      {/* Totals */}
      <div className="grid grid-cols-2 divide-x divide-[var(--color-border)] border-b border-[var(--color-border)]">
        <div className="px-4 py-4">
          <p className="text-xs text-[var(--color-ink-muted)] mb-1">You owe</p>
          <p className="text-2xl font-bold text-[var(--color-ink)]">
            {formatDollars(totalOwe)}
          </p>
        </div>
        <div className="px-4 py-4">
          <p className="text-xs text-[var(--color-ink-muted)] mb-1">
            You are owed
          </p>
          <p className="text-2xl font-bold text-[var(--color-ink)]">
            {formatDollars(totalOwed)}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3 px-4 py-5">
        {BALANCES.map((b) => (
          <a key={b.hangoutId} href="/money/settle" className="block">
            <Card className="hover:border-[var(--color-accent)] transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {b.hangoutName}
                  </p>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    {b.podName} · {b.date}
                  </p>
                </div>
                <BalanceChip status={b.status} />
              </div>
              <div className="mt-2 flex gap-4">
                {b.youOwe !== null && (
                  <p className="text-sm text-[var(--color-ink)]">
                    You owe <strong>{formatDollars(b.youOwe)}</strong>
                  </p>
                )}
                {b.youAreOwed !== null && (
                  <p className="text-sm text-[var(--color-ink)]">
                    You are owed <strong>{formatDollars(b.youAreOwed)}</strong>
                  </p>
                )}
                {b.youOwe === null && b.youAreOwed === null && (
                  <p className="text-sm text-[var(--color-ink-muted)]">
                    Settled
                  </p>
                )}
              </div>
            </Card>
          </a>
        ))}
      </div>
    </main>
  );
}
