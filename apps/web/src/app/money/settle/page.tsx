'use client';
// P24, Settle up. Review, confirm, result only after the server confirms.
// The gate is closed in this demo: nothing fires, nothing marks paid.
// Shares are displayed from the ledger, never computed here.
import { useState } from 'react';
import {
  Button,
  ScreenHeader,
  BackButton,
  Card,
  BalanceChip,
  SandboxBanner,
} from '@/components/ui';
import {
  LEDGER,
  ME_ID,
  formatMoney,
  personName,
  podById,
} from '@/lib/heypal/seed';

type BalanceStatus = 'owed' | 'pending' | 'paid' | 'failed';

interface Balance {
  memberId: string;
  memberName: string;
  hangout: string;
  amountCents: number;
  status: BalanceStatus;
}

// Derived from the ledger: lines where Janani owes the payer.
const MY_BALANCES: Balance[] = LEDGER.filter(
  (l) => l.status === 'open' && l.paidById !== ME_ID,
).map((l) => ({
  memberId: l.paidById,
  memberName: personName(l.paidById),
  hangout: `${l.planTitle} · ${podById(l.podId).name}`,
  amountCents: l.eachCents,
  status: 'owed',
}));

// What the payer (Janani, for Jazz night) sees.
const PAYER_BALANCES: Balance[] = LEDGER.filter(
  (l) => l.status === 'open' && l.paidById === ME_ID,
).flatMap((l) =>
  l.memberIds
    .filter((id) => id !== ME_ID)
    .map((id) => ({
      memberId: id,
      memberName: personName(id),
      hangout: `${l.planTitle} · ${podById(l.podId).name}`,
      amountCents: l.eachCents,
      status: 'owed' as BalanceStatus,
    })),
);

const PAYMENT_GATE_OPEN = false;

export default function SettleUpPage() {
  const [myBalances, setMyBalances] = useState(MY_BALANCES);
  const [view, setView] = useState<'owe' | 'owed'>('owe');

  // The payment gate is closed in this demo. When it opens, a tap moves
  // the balance to pending, and only the verified confirmation may move
  // it to paid. Nothing here ever marks a balance paid by itself.
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
    <main data-surface="white" className="flex flex-col min-h-dvh">
      <SandboxBanner />
      <ScreenHeader title="Settle up" back={<BackButton href="/money" />} />

      <div className="flex border-b border-[var(--sky)]">
        {(['owe', 'owed'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`flex-1 py-3 text-sm font-medium ${
              view === v
                ? 'text-[var(--ink)] border-b-2 border-[var(--deep)]'
                : 'text-[var(--ink-muted)]'
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
              <p className="text-lg font-semibold text-[var(--ink)]">
                All clear
              </p>
              <p className="text-sm text-[var(--ink-muted)]">
                You do not owe anyone right now.
              </p>
            </div>
          ) : (
            myBalances.map((b) => (
              <Card key={b.memberId}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      You owe {b.memberName}
                    </p>
                    <p className="text-[13px] text-[var(--ink-muted)]">
                      {b.hangout}
                    </p>
                  </div>
                  <BalanceChip status={b.status} />
                </div>
                <p className="text-xl font-bold tabular text-[var(--ink)] mb-3">
                  {formatMoney(b.amountCents)}
                </p>
                {b.status === 'owed' && (
                  <>
                    <Button
                      fullWidth
                      disabled={!PAYMENT_GATE_OPEN}
                      aria-describedby={`gate-${b.memberId}`}
                      onClick={() => initiatePayment(b.memberId)}
                    >
                      {`Pay ${formatMoney(b.amountCents)} to ${b.memberName}`}
                    </Button>
                    {!PAYMENT_GATE_OPEN && (
                      <p
                        id={`gate-${b.memberId}`}
                        className="mt-2 text-sm text-[var(--ink-muted)]"
                      >
                        Payments are off in this sandbox demo. Nothing is
                        charged, and your balance stays owed.
                      </p>
                    )}
                  </>
                )}
                {b.status === 'pending' && (
                  <p className="text-sm text-[var(--ink-muted)]">
                    Payment pending. Waiting for PayPal confirmation.
                  </p>
                )}
                {b.status === 'paid' && (
                  <p className="text-sm text-[var(--color-status-paid)] font-medium">
                    Paid
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
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {b.memberName}
                    </p>
                    <p className="text-[13px] text-[var(--ink-muted)]">
                      {b.hangout}
                    </p>
                  </div>
                  <BalanceChip status={b.status} />
                </div>
                <p className="text-lg font-bold tabular text-[var(--ink)] mt-1">
                  {formatMoney(b.amountCents)}
                </p>
                {b.status === 'owed' && (
                  <p className="mt-2 text-[13px] text-[var(--ink-muted)]">
                    Reminder sent privately to {b.memberName}. Not to the pod
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
