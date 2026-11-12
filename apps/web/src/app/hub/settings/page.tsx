'use client';
// P20 — Settings
// Notifications, permissions, subscription, privacy, account (spec p.12).
import { useState } from 'react';
import { ScreenHeader, BackButton, Button, Card } from '@/components/ui';

export default function SettingsPage() {
  // Exactly the four switches in the contract's NotificationSettings.
  const [notifications, setNotifications] = useState({
    polls: true,
    reminders: true,
    privateAsks: true,
    money: true,
  });

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
        <span className="text-sm text-[var(--color-ink)]">{label}</span>
        <span
          className="ml-auto text-xs text-[var(--color-ink-muted)]"
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
          className={`w-11 h-6 rounded-full relative transition-colors ${checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'}`}
          aria-hidden="true"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </div>
      </label>
    );
  }

  return (
    <main className="flex flex-col min-h-dvh">
      <ScreenHeader title="Settings" back={<BackButton href="/home" />} />

      <div className="flex flex-col gap-6 px-4 py-5">
        {/* Notifications */}
        <section aria-labelledby="notifications-heading">
          <h2
            id="notifications-heading"
            className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3"
          >
            Notifications
          </h2>
          <Card>
            <div className="flex flex-col divide-y divide-[var(--color-border)]">
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
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
            Reminders about you go only to you, never into a pod chat.
          </p>
        </section>

        {/* Permissions */}
        <section aria-labelledby="permissions-heading">
          <h2
            id="permissions-heading"
            className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3"
          >
            Permissions
          </h2>
          <Card>
            <div className="flex flex-col divide-y divide-[var(--color-border)]">
              {[
                { label: 'Contacts', status: 'Allowed' },
                { label: 'Notifications', status: 'Allowed' },
                { label: 'Calendar', status: 'Allowed' },
              ].map((p) => (
                <div
                  key={p.label}
                  className="flex items-center justify-between min-h-[52px]"
                >
                  <span className="text-sm text-[var(--color-ink)]">
                    {p.label}
                  </span>
                  <span className="text-sm text-[var(--color-ink-muted)]">
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
            <Button variant="secondary" fullWidth className="mt-3">
              Open phone settings
            </Button>
          </Card>
        </section>

        {/* Subscription */}
        <section aria-labelledby="subscription-heading">
          <h2
            id="subscription-heading"
            className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3"
          >
            Subscription
          </h2>
          <Card>
            <p className="text-sm font-medium text-[var(--color-ink)]">
              $15/month · Active
            </p>
            <p className="text-xs text-[var(--color-ink-muted)] mt-1">
              Billed through the app store. Demo — no real charge.
            </p>
            <Button variant="ghost" fullWidth className="mt-3">
              Manage subscription
            </Button>
          </Card>
        </section>

        {/* Privacy */}
        <section aria-labelledby="privacy-heading">
          <h2
            id="privacy-heading"
            className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3"
          >
            Privacy
          </h2>
          <Card>
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="font-medium text-[var(--color-ink)]">
                  Your planner sees
                </dt>
                <dd className="text-[var(--color-ink-muted)]">
                  Your interests, your private limits, your private chat, and
                  whether you are free or busy. Never what is in your calendar.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--color-ink)]">
                  Your pod sees
                </dt>
                <dd className="text-[var(--color-ink-muted)]">
                  Your name and photo, your messages, your votes and your
                  ready-check answers. Never your limits, your budget answers,
                  your calendar, or balances they are not part of.
                </dd>
              </div>
            </dl>
          </Card>
        </section>

        {/* Account */}
        <section aria-labelledby="account-heading">
          <h2
            id="account-heading"
            className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3"
          >
            Account
          </h2>
          <Card>
            <div className="flex flex-col gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  window.location.href = '/signin';
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
                    window.location.href = '/signin';
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
