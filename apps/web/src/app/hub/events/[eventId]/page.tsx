'use client';
// P17 — Event detail + suggest-to-pod
import { useState } from 'react';
import {
  Button,
  ScreenHeader,
  BackButton,
  Card,
  SandboxBanner,
} from '@/components/ui';

const DEMO_EVENT = {
  eventId: 'evt-001',
  title: 'Open Bowl Night',
  venue: 'Brooklyn Bowl',
  neighborhood: 'Williamsburg',
  borough: 'Brooklyn',
  address: '61 Wythe Ave, Brooklyn, NY 11249',
  date: 'Fri Nov 20, 7–10 PM',
  estCostPerPerson: 35,
  tags: ['Active', 'Nightlife', 'Food'],
  dietaryOptions: ['Vegetarian', 'Vegan'],
  travelMinutesFromMidtown: 25,
  description:
    'Bowling lanes plus a full kitchen and bar. Synthetic event for demo.',
};

const MY_PODS = ['Friday crew', 'Work pals', 'Cousins'];

export default function EventDetailPage() {
  const [suggestedTo, setSuggestedTo] = useState<string | null>(null);
  const e = DEMO_EVENT;

  return (
    <main className="flex flex-col min-h-dvh">
      <SandboxBanner />
      <ScreenHeader title={e.title} back={<BackButton href="/hub/events" />} />

      <div className="flex flex-col gap-5 px-4 py-5">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-ink)]">
            {e.title}
          </h2>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {e.venue} · {e.neighborhood}, {e.borough}
          </p>
          <p className="text-xs text-[var(--color-ink-muted)]">{e.address}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Date &amp; time
            </p>
            <p className="text-sm font-semibold text-[var(--color-ink)] mt-1">
              {e.date}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--color-ink-muted)]">Est. cost</p>
            <p className="text-sm font-semibold text-[var(--color-ink)] mt-1">
              {e.estCostPerPerson === 0
                ? 'Free'
                : `~$${e.estCostPerPerson}/person`}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Travel (from Midtown)
            </p>
            <p className="text-sm font-semibold text-[var(--color-ink)] mt-1">
              ~{e.travelMinutesFromMidtown} min
            </p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Dietary options
            </p>
            <p className="text-sm font-semibold text-[var(--color-ink)] mt-1">
              {e.dietaryOptions.length
                ? e.dietaryOptions.join(', ')
                : 'None listed'}
            </p>
          </Card>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {e.tags.map((t) => (
            <span
              key={t}
              className="px-3 py-1 bg-[var(--color-surface-sunken)] border border-[var(--color-border)] rounded-full text-xs text-[var(--color-ink-muted)]"
            >
              {t}
            </span>
          ))}
        </div>

        <p className="text-sm text-[var(--color-ink-muted)] italic">
          {e.description}
        </p>

        {/* Suggest to pod */}
        <section aria-labelledby="suggest-heading">
          <h3
            id="suggest-heading"
            className="text-sm font-semibold text-[var(--color-ink)] mb-3"
          >
            Suggest to a pod
          </h3>
          {suggestedTo ? (
            <Card>
              <p className="text-sm text-[var(--color-ink)]">
                Suggested to <strong>{suggestedTo}</strong>
              </p>
              <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                The planner will add it to the shortlist. The pod votes — no
                auto-booking.
              </p>
              <Button
                variant="ghost"
                className="mt-2"
                onClick={() => setSuggestedTo(null)}
              >
                Suggest to another pod
              </Button>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {MY_PODS.map((pod) => (
                <Button
                  key={pod}
                  variant="secondary"
                  fullWidth
                  onClick={() => setSuggestedTo(pod)}
                >
                  Suggest to {pod}
                </Button>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
