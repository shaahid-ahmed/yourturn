'use client';
// P16, Events search: stacked colored cards from the expenses reference,
// a visible search bar, and filter chips. Data is the demo events seed.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader, BackButton } from '@/components/ui';
import { HeyMenu, cardFill, cardText } from '@/components/heypal';
import { EVENTS } from '@/lib/heypal/seed';

const CHIPS = ['Tonight', 'This weekend', 'Free', 'Food', 'Music', 'Active'];

const MENU_ITEMS = [
  { href: '/home', label: 'home', note: 'Your pods' },
  { href: '/hub/profile', label: 'profile', note: 'Interests and limits' },
  { href: '/hub/calendar', label: 'calendar', note: 'Your week' },
  { href: '/money', label: 'money', note: 'What you owe and are owed' },
  { href: '/hub/settings', label: 'settings', note: 'Notifications, plan' },
];

export default function EventsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<string[]>([]);

  function toggleChip(c: string) {
    setActive((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  const filtered = EVENTS.filter((e) => {
    if (
      search &&
      !e.title.toLowerCase().includes(search.toLowerCase()) &&
      !e.neighborhood.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (active.includes('Free') && e.priceCents !== null) return false;
    if (active.includes('Food') && e.category !== 'Food and drink')
      return false;
    if (active.includes('Music') && e.category !== 'Music') return false;
    if (active.includes('Active') && e.category !== 'Sports to play')
      return false;
    return true;
  });

  return (
    <main data-surface="white" className="flex flex-col min-h-dvh">
      <ScreenHeader
        title="Events"
        back={<BackButton href="/home" />}
        right={
          <HeyMenu surface="white" items={MENU_ITEMS} current="/hub/events" />
        }
      />

      <div className="px-4 pt-4">
        <h1 className="text-[32px] font-bold text-[var(--ink)]">
          Happening in NYC
        </h1>
        <label htmlFor="events-search" className="sr-only">
          Search events
        </label>
        <input
          id="events-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events"
          className="mt-3 w-full rounded-full bg-[var(--pale)] px-4 min-h-[44px] text-base text-[var(--ink)] border-none"
        />
        <div
          className="flex gap-2 overflow-x-auto pb-1 mt-3"
          role="group"
          aria-label="Filter events"
        >
          {CHIPS.map((c) => {
            const on = active.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleChip(c)}
                aria-pressed={on}
                className={`shrink-0 rounded-full px-4 min-h-[44px] text-base font-semibold border-none cursor-pointer ${
                  on
                    ? 'bg-[var(--deep)] text-[var(--white)]'
                    : 'bg-transparent text-[var(--ink)] border-2 border-[var(--blue-mid)]'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <p className="px-4 py-2 text-[13px] text-[var(--ink-muted)]">
        Demo data. Fictional venues and prices.
      </p>

      <div className="px-4 pb-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-lg font-bold text-[var(--ink)]">
              No events match
            </p>
            <p className="text-sm text-[var(--ink-muted)]">
              Try a different search or clear the chips.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setActive([]);
              }}
              className="text-base font-semibold text-[var(--ink)] underline underline-offset-4"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <ul className="hey-stack">
            {filtered.map((e, i) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/hub/events/${e.id}`)}
                  className="hey-stack-card"
                  style={{ background: cardFill(i), color: cardText(i) }}
                  aria-label={`${e.title}, ${e.priceCents === null ? 'Free' : `$${(e.priceCents / 100).toFixed(0)}`}, ${e.date} ${e.time}, ${e.neighborhood}`}
                >
                  <span className="block text-[13px] font-semibold">
                    {e.category}
                  </span>
                  <span className="flex items-end justify-between gap-2">
                    <span>
                      <span className="block text-[22px] font-bold leading-tight">
                        {e.title}
                      </span>
                      <span className="block text-sm font-medium">
                        {e.date} · {e.time} · {e.neighborhood}
                      </span>
                    </span>
                    <span className="text-[22px] font-bold tabular shrink-0">
                      {e.priceCents === null
                        ? 'Free'
                        : `$${(e.priceCents / 100).toFixed(0)}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
