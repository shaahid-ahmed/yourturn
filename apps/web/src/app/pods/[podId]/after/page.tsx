'use client';
// P23 — After the hangout
// One-tap rating (loved it / fine / not for me) → goes only to the member's planner, not the group.
import { useState } from 'react';
import { Button, ScreenHeader, BackButton, Card } from '@/components/ui';

const RATINGS = [
  {
    value: 'loved',
    label: '❤️ Loved it',
    description: 'More like this, please',
  },
  {
    value: 'fine',
    label: '👍 Fine',
    description: 'Was okay, no strong feeling',
  },
  {
    value: 'not_for_me',
    label: '👎 Not for me',
    description: 'Skip this type next time',
  },
] as const;

type Rating = (typeof RATINGS)[number]['value'];

export default function AfterHangoutPage() {
  const [rating, setRating] = useState<Rating | null>(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="flex flex-col min-h-dvh">
      <ScreenHeader
        title="After the hangout"
        back={<BackButton href="/pods/pod-1" />}
      />

      <div className="flex flex-col gap-5 px-4 py-6">
        {!submitted ? (
          <>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-ink)]">
                Brooklyn Bowl
              </h2>
              <p className="text-sm text-[var(--color-ink-muted)]">
                Friday crew · Nov 20
              </p>
            </div>

            <p className="text-sm text-[var(--color-ink-muted)]">
              Your rating goes only to your planner so it can tune future
              suggestions. It is never shared with the pod or shown to other
              members.
            </p>

            <div
              className="flex flex-col gap-3"
              role="group"
              aria-label="Rate this hangout"
            >
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  aria-pressed={rating === r.value}
                  onClick={() => setRating(r.value)}
                  className={`flex items-center gap-4 px-4 py-4 rounded-xl border min-h-[64px] text-left transition-colors ${
                    rating === r.value
                      ? 'border-[var(--color-accent)] bg-[var(--color-surface-sunken)]'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)]'
                  }`}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {r.label.split(' ')[0]}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-ink)]">
                      {r.label.split(' ').slice(1).join(' ')}
                    </p>
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      {r.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <Button
              fullWidth
              disabled={!rating}
              onClick={() => setSubmitted(true)}
            >
              Send to my planner
            </Button>
          </>
        ) : (
          <Card className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="text-4xl" aria-hidden="true">
              ✓
            </span>
            <p className="text-lg font-semibold text-[var(--color-ink)]">
              Thanks!
            </p>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Your rating was sent to your planner only. The group won't see it.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = '/home';
              }}
            >
              Back to home
            </Button>
          </Card>
        )}
      </div>
    </main>
  );
}
