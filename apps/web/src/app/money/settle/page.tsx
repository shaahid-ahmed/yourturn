'use client';
// P14 — Settle up
// For someone who owes: who they owe, how much, Pay with PayPal.
// For the payer: each person who owes them and status (owed/pending/paid/failed).
// Reminders are private per person — never go to the pod chat.
import { useState } from 'react';
import {
  Button,
  ScreenHeader,
  BackButton,
  Card,
  BalanceChip,
  SandboxBanner,
} from '@/components/ui';

type BalanceStatus = 'owed' | 'pending' | 'paid' | 'failed';

interface Balance {
  memberId: string;
  memberName: string;
  hangout: string;
  amountCents: number;
  status: BalanceStatus;
}

// Synthetic demo — viewing as "You" who owes Sam
const MY_BALANCES: Balance[] = [
  {
    memberId: 'sam',
    memberName: 'Sam',
    hangout: 'Brooklyn Bowl · Nov 20',
    amountCents: 3500,
    status: 'owed',
  },
];

// What payer (Sam) sees — others owe Sam
const PAYER_BALANCES: Balance[] = [
  {
    memberId: 'priya',
    memberName: 'Priya',
    hangout: 'Brooklyn Bowl · Nov 20',
    amountCents: 3500,
    status: 'paid',
  },
  {
    memberId: 'me',
    memberName: 'You',
    hangout: 'Brooklyn Bowl · Nov 20',
    amountCents: 3500,
    status: 'owed',
  },
];

const PAYMENT_GATE_OPEN = false;

function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function SettleUpPage() {
  const [myBalances, setMyBalances] = useState(MY_BALANCES);
  const [view, setView] = useState<'owe' | 'owed'>('owe');

  // The payment gate is closed until US-006 (Q-010, Q-012). When it opens,
  // a tap moves the balance to pending, and only PayPal's verified webhook
  // may move it to paid. Nothing here ever marks a balance paid by itself.
  function initiatePayment(memberId: string) {
    if (!PAYMENT_GATE_OPEN) return;
    setMyBalances((prev) =>
      prev.map((b) =>
        b.memberId === memberId
          ? { ...b, status: 'pending' as BalanceStatus }
          : b,
      ),
    );
  }

  return (
    <main className="flex flex-col min-h-dvh">
      <SandboxBanner />
      <ScreenHeader title="Settle up" back={<BackButton href="/money" />} />

      {/* View toggle */}
      <div className="flex border-b border-[var(--color-border)]">
        {(['owe', 'owed'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              view === v
                ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            {v === 'owe' ? 'What I owe' : "What I'm owed"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 px-4 py-5">
        {view === 'owe' ? (
          myBalances.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <p className="text-lg font-semibold text-[var(--color-ink)]">
                All clear
              </p>
              <p className="text-sm text-[var(--color-ink-muted)]">
                You don't owe anyone right now.
              </p>
            </div>
          ) : (
            myBalances.map((b) => (
              <Card key={b.memberId}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      You owe {b.memberName}
                    </p>
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      {b.hangout}
                    </p>
                  </div>
                  <BalanceChip status={b.status} />
                </div>
                <p className="text-xl font-bold text-[var(--color-ink)] mb-3">
                  {formatDollars(b.amountCents)}
                </p>
                {b.status === 'owed' && (
                  <>
                    <Button
                      fullWidth
                      disabled={!PAYMENT_GATE_OPEN}
                      aria-describedby={`gate-${b.memberId}`}
                      onClick={() => initiatePayment(b.memberId)}
                    >
                      Pay with PayPal
                    </Button>
                    {!PAYMENT_GATE_OPEN && (
                      <p
                        id={`gate-${b.memberId}`}
                        className="mt-2 text-sm text-[var(--color-ink-muted)]"
                      >
                        Payments are off in this sandbox demo. Nothing is
                        charged, and your balance stays owed.
                      </p>
                    )}
                  </>
                )}
                {b.status === 'pending' && (
                  <p className="text-sm text-[var(--color-ink-muted)]">
                    Payment pending — waiting for PayPal confirmation…
                  </p>
                )}
                {b.status === 'paid' && (
                  <p className="text-sm text-[var(--color-status-paid)] font-medium">
                    Paid ✓
                  </p>
                )}
                {b.status === 'failed' && (
                  <>
                    <p className="text-sm text-[var(--color-danger)] mb-2">
                      Payment failed. Balance returned to Owed.
                    </p>
                    <Button
                      fullWidth
                      disabled={!PAYMENT_GATE_OPEN}
                      onClick={() => initiatePayment(b.memberId)}
                    >
                      Try again
                    </Button>
                  </>
                )}
              </Card>
            ))
          )
        ) : (
          <div className="flex flex-col gap-3">
            {PAYER_BALANCES.map((b) => (
              <Card key={b.memberId}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {b.memberName}
                    </p>
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      {b.hangout}
                    </p>
                  </div>
                  <BalanceChip status={b.status} />
                </div>
                <p className="text-lg font-bold text-[var(--color-ink)] mt-1">
                  {formatDollars(b.amountCents)}
                </p>
                {b.status === 'owed' && (
                  <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                    Reminder sent privately to {b.memberName} — not to the pod
                    chat.
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
