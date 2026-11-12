'use client';
// P20, Settings as a grouped list with dotted dividers: notifications,
// permissions, privacy, payments, subscription, motion, help, account.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader, BackButton, Button, Card } from '@/components/ui';
import { HeyMenu } from '@/components/heypal';
import { PLAN_PRICE_CENTS, formatMoney } from '@/lib/heypal/seed';

const MENU_ITEMS = [
  { href: '/home', label: 'home', note: 'Your pods' },
  { href: '/hub/profile', label: 'profile', note: 'Interests and limits' },
  { href: '/hub/calendar', label: 'calendar', note: 'Your week' },
  { href: '/money', label: 'money', note: 'What you owe and are owed' },
  { href: '/hub/settings', label: 'settings', note: 'Notifications, plan' },
];

export default function SettingsPage() {
  const router = useRouter();
  // Exactly the four switches in the contract's NotificationSettings.
  const [notifications, setNotifications] = useState({
    polls: true,
    reminders: true,
    privateAsks: true,
    money: true,
  });
  const [reduceMotion, setReduceMotion] = useState(false);

  function Toggle({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
  }) {
    return (
      <label className="flex items-center justify-between gap-3 min-h-[52px] cursor-pointer">
        <span className="text-sm text-[var(--ink)]">{label}</span>
        <span
          className="ml-auto text-xs text-[var(--ink-muted)]"
          aria-hidden="true"
        >
          {checked ? 'On' : 'Off'}
        </span>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
          aria-label={label}
        />
        <div
          className="w-11 h-6 rounded-full relative"
          style={{ background: checked ? 'var(--deep)' : 'var(--sky)' }}
          aria-hidden="true"
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow"
            style={{
              transform: checked ? 'translateX(20px)' : 'translateX(0)',
            }}
          />
        </div>
      </label>
    );
  }

  return (
    <main data-surface="white" className="flex flex-col min-h-dvh">
      <ScreenHeader
        title="Settings"
        back={<BackButton href="/home" />}
        right={
          <HeyMenu surface="white" items={MENU_ITEMS} current="/hub/settings" />
        }
      />

      <div className="flex flex-col gap-6 px-4 py-5">
        <section aria-labelledby="notifications-heading">
          <h2
            id="notifications-heading"
            className="text-sm font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-3"
          >
            Notifications
          </h2>
          <Card>
            <div className="flex flex-col">
              <Toggle
                checked={notifications.polls}
                onChange={(v) => setNotifications((n) => ({ ...n, polls: v }))}
                label="Polls"
              />
              <Toggle
                checked={notifications.reminders}
                onChange={(v) =>
                  setNotifications((n) => ({ ...n, reminders: v }))
                }
                label="Reminders"
              />
              <Toggle
                checked={notifications.privateAsks}
                onChange={(v) =>
                  setNotifications((n) => ({ ...n, privateAsks: v }))
                }
                label="Private planner asks"
              />
              <Toggle
                checked={notifications.money}
                onChange={(v) => setNotifications((n) => ({ ...n, money: v }))}
                label="Money"
              />
            </div>
          </Card>
          <p className="mt-2 text-[13px] text-[var(--ink-muted)]">
            Reminders about you go only to you, never into a pod chat.
          </p>
        </section>

        <section aria-labelledby="motion-heading">
          <h2
            id="motion-heading"
            className="text-sm font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-3"
          >
            Motion
          </h2>
          <Card>
            <label className="flex items-center justify-between gap-3 min-h-[52px] cursor-pointer">
              <span className="text-sm text-[var(--ink)]">Reduce motion</span>
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(e) => setReduceMotion(e.target.checked)}
                className="w-6 h-6"
                style={{ accentColor: 'var(--deep)' }}
                aria-label="Reduce motion"
              />
            </label>
            <p className="text-[13px] text-[var(--ink-muted)]">
              Follows your system setting unless you turn this on.
            </p>
          </Card>
        </section>

        <section aria-labelledby="subscription-heading">
          <h2
            id="subscription-heading"
            className="text-sm font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-3"
          >
            Subscription
          </h2>
          <Card>
            <p className="text-sm font-medium text-[var(--ink)]">
              {formatMoney(PLAN_PRICE_CENTS).replace('.00', '')}/month · Active
            </p>
            <p className="text-[13px] text-[var(--ink-muted)] mt-1">
              Billed through the app store. Demo, and no real charge.
            </p>
            <Button variant="ghost" fullWidth className="mt-3">
              Manage subscription
            </Button>
          </Card>
        </section>

        <section aria-labelledby="privacy-heading">
          <h2
            id="privacy-heading"
            className="text-sm font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-3"
          >
            Privacy
          </h2>
          <Card>
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="font-medium text-[var(--ink)]">
                  Your planner sees
                </dt>
                <dd className="text-[var(--ink-muted)]">
                  Your interests, your private limits, your private chat, and
                  whether you are free or busy. Never what is in your calendar.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--ink)]">Your pod sees</dt>
                <dd className="text-[var(--ink-muted)]">
                  Your name and photo, your messages, your votes and your
                  ready-check answers. Never your limits, your budget answers,
                  your calendar, or balances they are not part of.
                </dd>
              </div>
            </dl>
          </Card>
        </section>

        <section aria-labelledby="account-heading">
          <h2
            id="account-heading"
            className="text-sm font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-3"
          >
            Account
          </h2>
          <Card>
            <div className="flex flex-col gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  router.push('/signin');
                }}
              >
                Log out
              </Button>
              <Button
                variant="destructive"
                fullWidth
                onClick={() => {
                  if (
                    confirm(
                      'Delete your account? Your profile and private limits are removed. Any open balances stay with the people involved until they are settled.',
                    )
                  )
                    router.push('/signin');
                }}
              >
                Delete account
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
