'use client';
// P13, Payer and split. Who pays and each yes-member's share. Nobody who
// said no appears. The client displays shares from the seed line, never
// computes them.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  ScreenHeader,
  BackButton,
  Card,
  SandboxBanner,
} from '@/components/ui';
import { formatMoney, ledgerById, personName } from '@/lib/heypal/seed';

const JAZZ = ledgerById('L2');
const PAYER = { id: JAZZ.paidById, name: personName(JAZZ.paidById) };

export default function PayerSplitPage() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <main data-surface="white" className="flex flex-col min-h-dvh">
      <SandboxBanner />
      <ScreenHeader
        title="Payer and split"
        back={<BackButton href="/home" />}
      />

      <div className="flex flex-col gap-5 px-4 py-5">
        <Card>
          <p className="text-[13px] text-[var(--ink-muted)] mb-1">
            Estimated total
          </p>
          <p className="text-2xl font-bold tabular text-[var(--ink)]">
            {formatMoney(JAZZ.totalCents)}
          </p>
          <p className="text-sm text-[var(--ink-muted)] mt-1">
            Jazz night · Sat Nov 14 · {JAZZ.memberIds.length} people
          </p>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-[var(--ink)] mb-2">
            Who pays the venue
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full bg-[var(--deep)] text-[var(--white)] flex items-center justify-center font-semibold"
              aria-hidden="true"
            >
              {PAYER.name[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">
                {PAYER.id === 'p-me' ? 'You' : PAYER.name}
              </p>
              <p className="text-[13px] text-[var(--ink-muted)]">
                Pays the full amount, then others settle with them
              </p>
            </div>
          </div>
          <p className="mt-2 text-[13px] text-[var(--ink-muted)]">
            The payer pays the venue and needs a linked PayPal account.
          </p>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-[var(--ink)] mb-3">
            Equal split, {formatMoney(JAZZ.eachCents)} each
          </p>
          <ul className="flex flex-col" role="list" aria-label="Split shares">
            {JAZZ.memberIds.map((id) => (
              <li key={id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full bg-[var(--pale)] flex items-center justify-center text-xs font-semibold text-[var(--ink)]"
                    aria-hidden="true"
                  >
                    {personName(id)[0]}
                  </div>
                  <span className="text-sm text-[var(--ink)]">
                    {id === 'p-me' ? 'You' : personName(id)}
                  </span>
                  {id === PAYER.id && (
                    <span className="text-xs text-[var(--ink-muted)]">
                      (payer)
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold tabular text-[var(--ink)]">
                  {id === PAYER.id
                    ? 'Paid'
                    : `Owes ${formatMoney(JAZZ.eachCents)}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-[var(--ink-muted)]">
            Everyone who said yes pays an equal share. Shares add up exactly to
            the total.
          </p>
        </Card>

        <div className="rounded-[28px] border-2 border-dotted border-[var(--sky)] p-3 text-[13px] text-[var(--ink-muted)]">
          After the hangout, the payer enters the final amount and each balance
          updates to match.
        </div>

        {!confirmed ? (
          <>
            <p className="text-[13px] text-center text-[var(--ink-muted)]">
              This is <strong>not a payment</strong> and not a reservation.
              Confirming creates an IOU balance for each member.
            </p>
            <Button fullWidth onClick={() => setConfirmed(true)}>
              Confirm split
            </Button>
          </>
        ) : (
          <Card>
            <p className="text-sm font-semibold text-[var(--color-status-paid)]">
              Split confirmed
            </p>
            <p className="text-[13px] text-[var(--ink-muted)] mt-1">
              IOU balances created. Each member will see what they owe.
            </p>
            <Button
              variant="secondary"
              fullWidth
              className="mt-3"
              onClick={() => {
                router.push('/money/settle');
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
