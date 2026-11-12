'use client';
// P23, Money home as a to-do list of colored pills. Every figure comes
// from the ledger in the seed: owed to me $140.00, I owe $30.00, net
// +$110.00. The client only displays what the seed computes.
import { useState } from 'react';
import { ScreenHeader, BackButton, SandboxBanner } from '@/components/ui';
import { HeyMenu } from '@/components/heypal';
import { cardFill, cardText } from '@/components/heypal';
import {
  ME_ID,
  formatMoney,
  moneySummary,
  personName,
  podById,
} from '@/lib/heypal/seed';

const MENU_ITEMS = [
  { href: '/home', label: 'home', note: 'Your pods' },
  { href: '/hub/profile', label: 'profile', note: 'Interests and limits' },
  { href: '/hub/calendar', label: 'calendar', note: 'Your week' },
  { href: '/money', label: 'money', note: 'What you owe and are owed' },
  { href: '/hub/settings', label: 'settings', note: 'Notifications, plan' },
];

function MoneyTotal({ cents }: { cents: number }) {
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString('en-US');
  const rest = String(abs % 100).padStart(2, '0');
  return (
    <p className="text-[52px] font-bold tabular text-[var(--ink)] leading-tight">
      {cents < 0 ? '-' : ''}${dollars}
      <span className="text-[52px] font-bold text-[var(--ink-muted)]">
        .{rest}
      </span>
    </p>
  );
}

export default function MoneyPage() {
  const [tab, setTab] = useState<'open' | 'settled'>('open');
  const summary = moneySummary();
  const lines = tab === 'open' ? summary.openLines : summary.settledLines;
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <main data-surface="white" className="flex flex-col min-h-dvh">
      <SandboxBanner />
      <ScreenHeader
        title="Money"
        back={<BackButton href="/home" />}
        right={<HeyMenu surface="white" items={MENU_ITEMS} current="/money" />}
      />

      {/* Balance block: one net number, sent by the server side. */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-base font-semibold text-[var(--ink-muted)]">
          {summary.label}
        </p>
        <MoneyTotal cents={summary.netCents} />
      </div>

      {/* Open and Settled pills. */}
      <div
        className="flex gap-2 px-5 py-3"
        role="tablist"
        aria-label="Balances"
      >
        {(['open', 'settled'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 min-h-[44px] text-base font-semibold border-none cursor-pointer ${
              tab === t
                ? 'bg-[var(--deep)] text-[var(--white)]'
                : 'bg-[var(--white)] text-[var(--ink)] border-2 border-[var(--deep)]'
            }`}
          >
            {t === 'open' ? 'Open' : 'Settled'}
          </button>
        ))}
      </div>

      <p className="px-5 pt-1 text-sm font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {tab === 'open' ? 'Open' : 'Settled'}
      </p>

      {/* The list of pills. */}
      <div className="flex flex-col gap-3 px-4 py-3">
        {lines.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-lg font-bold text-[var(--ink)]">
              Nothing to settle. Enjoy it.
            </p>
          </div>
        )}
        {lines.map((line, i) => {
          const pod = podById(line.podId);
          const iOwe = line.paidById !== ME_ID;
          const amount = iOwe
            ? line.eachCents
            : line.totalCents - line.eachCents;
          const isOpen = expanded === line.id;
          return (
            <div key={line.id}>
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : line.id)}
                aria-expanded={isOpen}
                className="hey-pill"
                style={{ background: cardFill(i), color: cardText(i) }}
              >
                <span>
                  <span
                    className={`hey-pill-label block ${tab === 'settled' ? 'line-through' : ''}`}
                  >
                    {line.planTitle}
                  </span>
                  <span className="hey-pill-sub block">
                    {pod.name}
                    {tab === 'settled' && line.settledDate
                      ? ` · ${line.settledDate}`
                      : ''}
                  </span>
                </span>
                <span className="hey-pill-amount">
                  {iOwe || tab === 'settled'
                    ? formatMoney(iOwe ? line.eachCents : line.eachCents)
                    : `+${formatMoney(amount)}`}
                  <small>
                    {tab === 'settled'
                      ? 'settled'
                      : iOwe
                        ? 'you owe'
                        : 'owed to you'}
                  </small>
                </span>
              </button>
              {isOpen && (
                <div className="hey-card bg-[var(--white)] border border-[var(--sky)] mt-2 p-4">
                  <p className="text-sm text-[var(--ink)]">
                    Total {formatMoney(line.totalCents)},{' '}
                    {line.memberIds.length} people, {personName(line.paidById)}{' '}
                    paid.
                  </p>
                  <ul className="mt-2 flex flex-col text-sm">
                    {line.memberIds
                      .filter((id) => id !== line.paidById)
                      .map((id) => (
                        <li key={id} className="flex justify-between py-1.5">
                          <span>
                            {personName(id)}
                            {id === ME_ID ? ' (you)' : ''}
                          </span>
                          <span className="tabular font-semibold">
                            {formatMoney(line.eachCents)}{' '}
                            {tab === 'settled'
                              ? '· Paid'
                              : `· Owes ${personName(line.paidById)}`}
                          </span>
                        </li>
                      ))}
                  </ul>
                  {tab === 'open' && iOwe && (
                    <a
                      href="/money/settle"
                      className="hey-btn hey-btn--primary w-full mt-3"
                    >
                      Settle up {formatMoney(line.eachCents)}
                    </a>
                  )}
                  {tab === 'open' && !iOwe && (
                    <p className="mt-3 text-sm text-[var(--ink-muted)]">
                      Gentle reminder sent. No guilt, just a nudge.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
