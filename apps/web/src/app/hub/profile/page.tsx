'use client';
// P19 — Profile (hub)
// Bio, phone, interests, private limits (behind lock badge). All editable.
import { useState } from 'react';
import {
  ScreenHeader,
  BackButton,
  Button,
  LockBadge,
  Card,
} from '@/components/ui';

const INTERESTS = [
  'Bowling',
  'Comedy',
  'Food markets',
  'Escape rooms',
  'Outdoor walks',
];

export default function ProfilePage() {
  const [editingInterests, setEditingInterests] = useState(false);
  const [interests, setInterests] = useState(INTERESTS);

  return (
    <main className="flex flex-col min-h-dvh">
      <ScreenHeader title="Profile" back={<BackButton href="/home" />} />

      <div className="flex flex-col gap-5 px-4 py-5">
        {/* Avatar + basics */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center text-2xl font-bold"
            aria-hidden="true"
          >
            A
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--color-ink)]">Alex</p>
            <p className="text-sm text-[var(--color-ink-muted)]">+1 555 0103</p>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Just here for the vibes
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => {
            window.location.href = '/profile/create';
          }}
        >
          Edit profile
        </Button>

        {/* Interests */}
        <section aria-labelledby="interests-heading">
          <div className="flex items-center justify-between mb-2">
            <h2
              id="interests-heading"
              className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide"
            >
              Interests
            </h2>
            <Button
              variant="ghost"
              onClick={() => setEditingInterests(!editingInterests)}
            >
              {editingInterests ? 'Done' : 'Edit'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {interests.map((i) => (
              <span
                key={i}
                className="flex items-center gap-1 px-3 py-1 bg-[var(--color-surface-sunken)] border border-[var(--color-border)] rounded-full text-sm text-[var(--color-ink)]"
              >
                {i}
                {editingInterests && (
                  <button
                    onClick={() =>
                      setInterests((prev) => prev.filter((x) => x !== i))
                    }
                    className="ml-1 text-[var(--color-ink-muted)] hover:text-[var(--color-danger)]"
                    aria-label={`Remove ${i}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        </section>

        {/* Private limits */}
        <section aria-labelledby="limits-heading">
          <div className="flex flex-col items-start gap-1 mb-2">
            <h2
              id="limits-heading"
              className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide"
            >
              Private limits
            </h2>
            <LockBadge />
          </div>
          <Card className="private-surface">
            <ul className="flex flex-col divide-y divide-[var(--color-border)]">
              <li className="flex items-center justify-between py-3">
                <span className="text-sm text-[var(--color-ink)]">
                  Budget per hangout
                </span>
                <span className="text-sm font-semibold text-[var(--color-ink)]">
                  $40
                </span>
              </li>
              <li className="flex items-center justify-between py-3">
                <span className="text-sm text-[var(--color-ink)]">
                  Dietary needs
                </span>
                <span className="text-sm text-[var(--color-ink)]">
                  Vegetarian
                </span>
              </li>
              <li className="flex items-center justify-between py-3">
                <span className="text-sm text-[var(--color-ink)]">
                  Max travel
                </span>
                <span className="text-sm text-[var(--color-ink)]">45 min</span>
              </li>
            </ul>
            <Button
              variant="ghost"
              fullWidth
              className="mt-2"
              onClick={() => {
                window.location.href = '/profile/create';
              }}
            >
              Edit private limits
            </Button>
          </Card>
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
            Your limits are stored in your private planner vault. Your pod and
            the group chat never see them.
          </p>
        </section>
      </div>
    </main>
  );
}
