'use client';
// After the hangout: one-tap rating (loved it, fine, not for me) that goes
// only to the member's planner, never the group. Dotted rating options.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ScreenHeader, BackButton, Card } from '@/components/ui';

const RATINGS = [
  {
    value: 'loved',
    label: 'Loved it',
    description: 'More like this, please',
  },
  {
    value: 'fine',
    label: 'Fine',
    description: 'Was okay, no strong feeling',
  },
  {
    value: 'not_for_me',
    label: 'Not for me',
    description: 'Skip this type next time',
  },
] as const;

type Rating = (typeof RATINGS)[number]['value'];

export default function AfterHangoutPage() {
  const router = useRouter();
  const [rating, setRating] = useState<Rating | null>(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <main data-surface="white" className="flex flex-col min-h-dvh">
      <ScreenHeader
        title="After the hangout"
        back={<BackButton href="/home" />}
      />

      <div className="flex flex-col gap-5 px-4 py-6">
        {!submitted ? (
          <>
            <div>
              <h2 className="text-xl font-bold text-[var(--ink)]">
                Brooklyn Bowl
              </h2>
              <p className="text-sm text-[var(--ink-muted)]">
                Friday Crew · Nov 20
              </p>
            </div>

            <p className="text-sm text-[var(--ink-muted)]">
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
                  className={`hey-card flex items-center gap-4 px-4 py-4 min-h-[64px] text-left border-2 cursor-pointer ${
                    rating === r.value
                      ? 'border-[var(--deep)] bg-[var(--pale)]'
                      : 'border-[var(--sky)] bg-[var(--white)]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="grid place-items-center w-9 h-9 rounded-full border-2 border-dotted border-[var(--blue-mid)] text-[var(--ink)] font-bold shrink-0"
                  >
                    {rating === r.value ? '✓' : '·'}
                  </span>
                  <div>
                    <p className="text-base font-semibold text-[var(--ink)]">
                      {r.label}
                    </p>
                    <p className="text-[13px] text-[var(--ink-muted)]">
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
            <span
              aria-hidden="true"
              className="grid place-items-center w-12 h-12 rounded-full bg-[var(--pale)] text-[var(--ink)] text-xl font-bold"
            >
              ✓
            </span>
            <p className="text-lg font-semibold text-[var(--ink)]">Thanks!</p>
            <p className="text-sm text-[var(--ink-muted)]">
              Your rating was sent to your planner only. The group will not see
              it.
            </p>
            <Button variant="secondary" onClick={() => router.push('/home')}>
              Back to home
            </Button>
          </Card>
        )}
      </div>
    </main>
  );
}
