'use client';
// P20 — Settings
// Notifications, permissions, subscription, privacy.
import { useState } from 'react';
import { ScreenHeader, BackButton, Button, Card } from '@/components/ui';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({ polls: true, reminders: true, bookings: true });
  const [trackingEnabled, setTrackingEnabled] = useState(false);

  function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
      <label className="flex items-center justify-between gap-3 min-h-[52px] cursor-pointer">
        <span className="text-sm text-[var(--color-ink)]">{label}</span>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only" aria-label={label} />
        <div
          className={`w-11 h-6 rounded-full relative transition-colors ${checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'}`}
          aria-hidden="true"
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
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
          <h2 id="notifications-heading" className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">Notifications</h2>
          <Card>
            <div className="flex flex-col divide-y divide-[var(--color-border)]">
              <Toggle checked={notifications.polls} onChange={v => setNotifications(n => ({ ...n, polls: v }))} label="Polls and votes" />
              <Toggle checked={notifications.reminders} onChange={v => setNotifications(n => ({ ...n, reminders: v }))} label="Balance reminders" />
              <Toggle checked={notifications.bookings} onChange={v => setNotifications(n => ({ ...n, bookings: v }))} label="Booking confirmations" />
            </div>
          </Card>
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">Notifications are never used for streaks or pressure.</p>
        </section>

        {/* Connection tracking */}
        <section aria-labelledby="tracking-heading">
          <h2 id="tracking-heading" className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">Connection tracking</h2>
          <Card>
            <Toggle checked={trackingEnabled} onChange={setTrackingEnabled} label="Allow connection-strength tracking" />
          </Card>
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
            Off by default. Tracking is your choice. If you turn it on, you can see your own data and turn it off at any time.
            Turning it off removes your edges from all computations, prompts, and cached results.
          </p>
        </section>

        {/* Permissions */}
        <section aria-labelledby="permissions-heading">
          <h2 id="permissions-heading" className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">Permissions</h2>
          <Card>
            <div className="flex flex-col divide-y divide-[var(--color-border)]">
              {[
                { label: 'Contacts', status: 'Allowed' },
                { label: 'Notifications', status: 'Allowed' },
                { label: 'Calendar', status: 'Allowed' },
              ].map(p => (
                <div key={p.label} className="flex items-center justify-between min-h-[52px]">
                  <span className="text-sm text-[var(--color-ink)]">{p.label}</span>
                  <span className="text-sm text-[var(--color-ink-muted)]">{p.status}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Subscription */}
        <section aria-labelledby="subscription-heading">
          <h2 id="subscription-heading" className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">Subscription</h2>
          <Card>
            <p className="text-sm font-medium text-[var(--color-ink)]">$15/month · Active</p>
            <p className="text-xs text-[var(--color-ink-muted)] mt-1">Billed through the app store. Demo — no real charge.</p>
            <Button variant="ghost" fullWidth className="mt-3">Manage subscription</Button>
          </Card>
        </section>

        {/* Privacy */}
        <section aria-labelledby="privacy-heading">
          <h2 id="privacy-heading" className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">Privacy</h2>
          <Card>
            <div className="flex flex-col gap-3">
              <Button variant="ghost" fullWidth>View my data</Button>
              <Button variant="ghost" fullWidth>Pause membership</Button>
              <Button variant="destructive" fullWidth onClick={() => { if (confirm('Leave all pods? Rotation consequences are suspended until resolved.')) window.location.href = '/signin'; }}>
                Delete account
              </Button>
            </div>
          </Card>
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">Access, deletion, and retention semantics are policy-pending (Q-006).</p>
        </section>
      </div>
    </main>
  );
}
