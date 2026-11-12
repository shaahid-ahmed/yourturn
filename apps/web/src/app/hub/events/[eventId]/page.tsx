'use client';
// P17, Event detail. The card color and shape grow into the header, then
// the dotted illustration, description, and pod picker.
import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Button,
  ScreenHeader,
  BackButton,
  Card,
  SandboxBanner,
} from '@/components/ui';
import { EVENTS, PODS } from '@/lib/heypal/seed';

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = typeof params.eventId === 'string' ? params.eventId : '';
  const e = EVENTS.find((ev) => ev.id === eventId) ?? EVENTS[0];
  const [suggestedTo, setSuggestedTo] = useState<string | null>(null);
  if (!e) return null;
  const price =
    e.priceCents === null ? 'Free' : `$${(e.priceCents / 100).toFixed(0)}`;

  return (
    <main data-surface="white" className="flex flex-col min-h-dvh">
      <SandboxBanner />
      <ScreenHeader title={e.title} back={<BackButton href="/hub/events" />} />

      <div className="hey-card bg-[var(--deep)] text-[var(--white)] mx-4 mt-4 p-5">
        <p className="text-[13px] font-semibold">{e.category}</p>
        <h2 className="text-[28px] font-bold leading-tight">{e.title}</h2>
        <p className="mt-1 text-[22px] font-bold tabular">{price}</p>
        <p className="mt-1 text-sm font-medium">
          {e.date} · {e.time} · {e.neighborhood}
        </p>
      </div>

      <div className="flex flex-col gap-5 px-4 py-5">
        <div
          aria-hidden="true"
          className="hey-dots hey-card h-24 text-[var(--blue-mid)]"
        />
        <p className="text-base text-[var(--ink-muted)]">{e.description}</p>

        {/* Suggest to pod */}
        <section aria-labelledby="suggest-heading">
          <h3
            id="suggest-heading"
            className="text-sm font-semibold text-[var(--ink)] mb-3"
          >
            Suggest to a pod
          </h3>
          {suggestedTo ? (
            <Card>
              <p className="text-sm text-[var(--ink)]">
                Suggested to <strong>{suggestedTo}</strong>
              </p>
              <p className="text-xs text-[var(--ink-muted)] mt-1">
                The planner will add it to the shortlist. The pod votes, and
                nothing books itself.
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
              {PODS.map((pod) => (
                <Button
                  key={pod.id}
                  variant="secondary"
                  fullWidth
                  onClick={() => setSuggestedTo(pod.name)}
                >
                  Suggest to {pod.name}
                </Button>
              ))}
            </div>
          )}
        </section>

        <Button variant="secondary" fullWidth>
          Add to my calendar
        </Button>
      </div>
    </main>
  );
}
