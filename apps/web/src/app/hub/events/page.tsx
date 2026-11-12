'use client';
// P16 — Events search
// Browse synthetic NYC events and activities. Suggest-to-pod from P17.
import { useState } from 'react';
import { ScreenHeader, BackButton, Card, Button } from '@/components/ui';

const TAGS = [
  'Active',
  'Food',
  'Outdoor',
  'Nightlife',
  'Comedy',
  'Cultural',
  'Indoor',
];
const BOROUGHS = ['All', 'Manhattan', 'Brooklyn', 'Queens'];

interface EventItem {
  eventId: string;
  title: string;
  venue: string;
  neighborhood: string;
  borough: string;
  date: string;
  estCostPerPerson: number;
  tags: string[];
  synthetic: true;
}

const DEMO_EVENTS: EventItem[] = [
  {
    eventId: 'evt-001',
    title: 'Open Bowl Night',
    venue: 'Brooklyn Bowl',
    neighborhood: 'Williamsburg',
    borough: 'Brooklyn',
    date: 'Fri Nov 20, 7–10 PM',
    estCostPerPerson: 35,
    tags: ['Active', 'Food'],
    synthetic: true,
  },
  {
    eventId: 'evt-002',
    title: 'Late Night Thursday',
    venue: 'MoMA PS1',
    neighborhood: 'Long Island City',
    borough: 'Queens',
    date: 'Thu Nov 19, 5–8 PM',
    estCostPerPerson: 18,
    tags: ['Cultural'],
    synthetic: true,
  },
  {
    eventId: 'evt-003',
    title: 'Weekend Food Market',
    venue: 'Smorgasburg',
    neighborhood: 'Prospect Park',
    borough: 'Brooklyn',
    date: 'Sat Nov 21, 11 AM–6 PM',
    estCostPerPerson: 25,
    tags: ['Food', 'Outdoor'],
    synthetic: true,
  },
  {
    eventId: 'evt-004',
    title: 'Friday Evening Swing Suite',
    venue: 'Topgolf Swing Suite',
    neighborhood: 'Chelsea',
    borough: 'Manhattan',
    date: 'Fri Nov 20, 6–9 PM',
    estCostPerPerson: 45,
    tags: ['Active', 'Food'],
    synthetic: true,
  },
  {
    eventId: 'evt-005',
    title: 'Evening Walk',
    venue: 'The High Line',
    neighborhood: 'Chelsea',
    borough: 'Manhattan',
    date: 'Thu Nov 19, 5:30–7:30 PM',
    estCostPerPerson: 0,
    tags: ['Outdoor', 'Active'],
    synthetic: true,
  },
  {
    eventId: 'evt-007',
    title: 'Friday Escape Challenge',
    venue: 'Clue Chase Escape Rooms',
    neighborhood: 'Midtown',
    borough: 'Manhattan',
    date: 'Fri Nov 20, 8–9:30 PM',
    estCostPerPerson: 30,
    tags: ['Active', 'Indoor'],
    synthetic: true,
  },
  {
    eventId: 'evt-008',
    title: 'Thursday Late Show',
    venue: 'Comedy Cellar',
    neighborhood: 'Greenwich Village',
    borough: 'Manhattan',
    date: 'Thu Nov 19, 10 PM–midnight',
    estCostPerPerson: 32,
    tags: ['Nightlife', 'Comedy'],
    synthetic: true,
  },
];

export default function EventsPage() {
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [borough, setBorough] = useState('All');

  function toggleTag(t: string) {
    setActiveTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  const filtered = DEMO_EVENTS.filter((e) => {
    if (
      search &&
      !e.title.toLowerCase().includes(search.toLowerCase()) &&
      !e.venue.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (activeTags.length && !activeTags.some((t) => e.tags.includes(t)))
      return false;
    if (borough !== 'All' && e.borough !== borough) return false;
    return true;
  });

  return (
    <main className="flex flex-col min-h-dvh">
      <ScreenHeader title="Events" back={<BackButton href="/home" />} />

      <div className="px-4 py-3 border-b border-[var(--color-border)] flex flex-col gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events and venues…"
          className="w-full min-h-[44px] rounded-xl border border-[var(--color-border)] px-4 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
          aria-label="Search events"
        />
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filter by tag"
        >
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              aria-pressed={activeTags.includes(t)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs border min-h-[36px] transition-colors ${
                activeTags.includes(t)
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                  : 'bg-transparent text-[var(--color-ink-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filter by borough"
        >
          {BOROUGHS.map((b) => (
            <button
              key={b}
              onClick={() => setBorough(b)}
              aria-pressed={borough === b}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs border min-h-[36px] transition-colors ${
                borough === b
                  ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                  : 'bg-transparent text-[var(--color-ink-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)]'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <p className="px-4 py-2 text-xs text-[var(--color-ink-muted)] bg-[var(--color-surface-sunken)] border-b border-[var(--color-border)]">
        Synthetic NYC events — fictional venues and prices. No real bookings.
      </p>

      <div className="flex flex-col gap-3 px-4 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-lg font-semibold text-[var(--color-ink)]">
              No events match
            </p>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Try different filters or clear them.
            </p>
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('');
                setActiveTags([]);
                setBorough('All');
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          filtered.map((e) => (
            <a
              key={e.eventId}
              href={`/hub/events/${e.eventId}`}
              className="block"
            >
              <Card className="hover:border-[var(--color-accent)] transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {e.title}
                    </p>
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      {e.venue} · {e.neighborhood}
                    </p>
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      {e.date}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-ink)] shrink-0">
                    {e.estCostPerPerson === 0
                      ? 'Free'
                      : `~$${e.estCostPerPerson}/pp`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {e.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border)] rounded-full text-xs text-[var(--color-ink-muted)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Card>
            </a>
          ))
        )}
      </div>
    </main>
  );
}
