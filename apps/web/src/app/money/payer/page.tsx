'use client';
// P13 — Payer and split
// Who pays and each yes-member's share. Nobody who said no appears.
// LLM never touches payments. Payer confirms; then balances are created in the IOU ledger.
import { useState } from 'react';
import {
  Button,
  ScreenHeader,
  BackButton,
  Card,
  SandboxBanner,
} from '@/components/ui';

const DEMO_YES_MEMBERS = [
  { id: 'sam', name: 'Sam', shareCents: 3500 },
  { id: 'priya', name: 'Priya', shareCents: 3500 },
  { id: 'me', name: 'You', shareCents: 3500 },
];

const TOTAL_CENTS = 10500;
const PAYER = { id: 'sam', name: 'Sam' };

function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PayerSplitPage() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <main className="flex flex-col min-h-dvh">
      <SandboxBanner />
      <ScreenHeader
        title="Payer and split"
        back={<BackButton href="/pods/pod-1" />}
      />

      <div className="flex flex-col gap-5 px-4 py-5">
        {/* Total */}
        <Card>
          <p className="text-xs text-[var(--color-ink-muted)] mb-1">
            Estimated total
          </p>
          <p className="text-2xl font-bold text-[var(--color-ink)]">
            {formatDollars(TOTAL_CENTS)}
          </p>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            Brooklyn Bowl · Fri Nov 20 · 3 people said yes
          </p>
        </Card>

        {/* Payer */}
        <Card>
          <p className="text-sm font-semibold text-[var(--color-ink)] mb-2">
            Who pays the venue
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center font-semibold"
              aria-hidden="true"
            >
              {PAYER.name[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-ink)]">
                {PAYER.name}
              </p>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Pays the full amount, then others settle with them
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
            Choosing the payer is open (section 12). Payer must have a linked
            PayPal account.
          </p>
        </Card>

        {/* Split */}
        <Card>
          <p className="text-sm font-semibold text-[var(--color-ink)] mb-3">
            Equal split
          </p>
          <ul
            className="flex flex-col divide-y divide-[var(--color-border)]"
            role="list"
            aria-label="Split shares"
          >
            {DEMO_YES_MEMBERS.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full bg-[var(--color-surface-sunken)] flex items-center justify-center text-xs font-semibold text-[var(--color-ink)]"
                    aria-hidden="true"
                  >
                    {m.name[0]}
                  </div>
                  <span className="text-sm text-[var(--color-ink)]">
                    {m.name}
                  </span>
                  {m.id === PAYER.id && (
                    <span className="text-xs text-[var(--color-ink-muted)]">
                      (payer)
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-[var(--color-ink)]">
                  {formatDollars(m.shareCents)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
            Shares are rounded to whole cents and add up to the total. Odd cents
            rotate deterministically. Custom split is open.
          </p>
        </Card>

        {/* After-event note */}
        <div className="rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border)] p-3 text-xs text-[var(--color-ink-muted)]">
          After the hangout, {PAYER.name} enters the final amount and each
          balance updates to match.
        </div>

        {/* Confirm */}
        {!confirmed ? (
          <>
            <p className="text-xs text-center text-[var(--color-ink-muted)]">
              This is <strong>not a payment</strong> and not a reservation.
              Confirming creates an IOU balance for each member.
            </p>
            <Button fullWidth onClick={() => setConfirmed(true)}>
              Confirm split — {PAYER.name} pays
            </Button>
          </>
        ) : (
          <Card>
            <p className="text-sm font-semibold text-green-700">
              Split confirmed
            </p>
            <p className="text-xs text-[var(--color-ink-muted)] mt-1">
              IOU balances created. Each member will see what they owe{' '}
              {PAYER.name}.
            </p>
            <Button
              variant="secondary"
              fullWidth
              className="mt-3"
              onClick={() => {
                window.location.href = '/money/settle';
              }}
            >
              Go to Settle up
            </Button>
          </Card>
        )}
      </div>
    </main>
  );
}
