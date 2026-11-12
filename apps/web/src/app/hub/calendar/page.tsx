'use client';
// P18, Calendar in the reference structure: Agenda day cards with time
// columns, and a Year grid of colored month cards. Every plan comes from
// the seed. Only my plans and my pods shared plans show here.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader, BackButton, Button } from '@/components/ui';
import { HeyMenu } from '@/components/heypal';
import { PLANS, podById } from '@/lib/heypal/seed';

const MENU_ITEMS = [
  { href: '/home', label: 'home', note: 'Your pods' },
  { href: '/hub/profile', label: 'profile', note: 'Interests and limits' },
  { href: '/hub/calendar', label: 'calendar', note: 'Your week' },
  { href: '/money', label: 'money', note: 'What you owe and are owed' },
  { href: '/hub/settings', label: 'settings', note: 'Notifications, plan' },
];

// Weekday fill map, stable so a card never changes color between visits.
const WEEKDAY_FILL: Record<string, { bg: string; fg: string }> = {
  Mon: { bg: 'var(--card-deep)', fg: 'var(--white)' },
  Tue: { bg: 'var(--card-royal)', fg: 'var(--white)' },
  Wed: { bg: 'var(--card-sky)', fg: 'var(--ink)' },
  Thu: { bg: 'var(--card-pale)', fg: 'var(--ink)' },
  Fri: { bg: 'var(--card-white)', fg: 'var(--ink)' },
  Sat: { bg: 'var(--card-royal)', fg: 'var(--white)' },
  Sun: { bg: 'var(--card-deep)', fg: 'var(--white)' },
};

const MONTH_FILL = [
  'var(--card-deep)',
  'var(--card-royal)',
  'var(--card-sky)',
  'var(--card-pale)',
  'var(--card-white)',
  'var(--card-deep)',
  'var(--card-royal)',
  'var(--card-sky)',
  'var(--card-pale)',
  'var(--card-white)',
  'var(--card-deep)',
  'var(--card-royal)',
];

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

interface DayPlan {
  weekday: string;
  day: string;
  month: string;
  isToday: boolean;
  plans: typeof PLANS;
}

const AGENDA: DayPlan[] = [
  {
    weekday: 'Thu',
    day: '12',
    month: 'NOV',
    isToday: true,
    plans: [],
  },
  {
    weekday: 'Sat',
    day: '14',
    month: 'NOV',
    isToday: false,
    plans: PLANS.filter((p) => p.id === 'plan-jazz'),
  },
  {
    weekday: 'Wed',
    day: '18',
    month: 'NOV',
    isToday: false,
    plans: PLANS.filter((p) => p.id === 'plan-game'),
  },
  {
    weekday: 'Fri',
    day: '20',
    month: 'NOV',
    isToday: false,
    plans: PLANS.filter((p) => p.id === 'plan-friday-out'),
  },
  {
    weekday: 'Sun',
    day: '22',
    month: 'NOV',
    isToday: false,
    plans: PLANS.filter((p) => p.id === 'plan-sunday-hike'),
  },
  {
    weekday: 'Fri',
    day: '6',
    month: 'NOV',
    isToday: false,
    plans: PLANS.filter((p) => p.id === 'plan-ramen'),
  },
  {
    weekday: 'Sun',
    day: '8',
    month: 'NOV',
    isToday: false,
    plans: PLANS.filter((p) => p.id === 'plan-brunch'),
  },
];

export default function CalendarPage() {
  const router = useRouter();
  const [view, setView] = useState<'agenda' | 'year'>('agenda');
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'all'>('all');
  const [monthQuery, setMonthQuery] = useState('');

  const days =
    filter === 'today'
      ? AGENDA.filter((d) => d.isToday)
      : filter === 'tomorrow'
        ? AGENDA.filter((d) => d.day === '13')
        : AGENDA;

  return (
    <main data-surface="white" className="flex flex-col min-h-dvh">
      <ScreenHeader
        title="Calendar"
        back={<BackButton href="/home" />}
        right={
          <HeyMenu surface="white" items={MENU_ITEMS} current="/hub/calendar" />
        }
      />

      {view === 'agenda' ? (
        <>
          {/* Filter pills and add. */}
          <div className="flex items-center gap-2 px-4 pt-4">
            {(['Today', 'Tomorrow', 'All'] as const).map((f) => {
              const key = f.toLowerCase() as 'today' | 'tomorrow' | 'all';
              const selected = filter === key;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(key)}
                  aria-pressed={selected}
                  className={`rounded-full px-4 min-h-[44px] text-base font-semibold border-none cursor-pointer ${
                    selected
                      ? 'bg-[var(--deep)] text-[var(--white)]'
                      : 'bg-[var(--white)] text-[var(--ink)] border-2 border-[var(--deep)]'
                  }`}
                >
                  {f}
                </button>
              );
            })}
            <span className="flex-1" />
            <button
              type="button"
              aria-label="Suggest a plan"
              onClick={() => router.push('/hub/events')}
              className="grid place-items-center w-11 h-11 rounded-full border-2 border-[var(--deep)] text-[var(--ink)] bg-transparent cursor-pointer"
            >
              <span aria-hidden="true" className="text-xl leading-none">
                +
              </span>
            </button>
          </div>

          {/* Month switcher. */}
          <div className="px-4 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-[var(--ink-muted)]">
                OCT
              </span>
              <button
                type="button"
                onClick={() => setView('year')}
                className="text-[36px] font-bold text-[var(--ink)] bg-transparent border-none cursor-pointer"
                aria-label="Open year view, November"
              >
                NOV
              </button>
              <span className="text-lg font-semibold text-[var(--ink-muted)]">
                DEC
              </span>
            </div>
            <div aria-hidden="true" className="mt-2 h-px bg-[var(--sky)]" />
          </div>

          {/* Day cards. */}
          <div className="flex flex-col gap-3 px-4 py-4">
            {days.length === 0 && (
              <div className="hey-card bg-[var(--pale)] p-5 text-center">
                <p className="text-base font-semibold text-[var(--ink)]">
                  Nothing planned
                </p>
                <Button
                  variant="secondary"
                  className="mt-3"
                  onClick={() => router.push('/hub/events')}
                >
                  Ask HeyPal for ideas
                </Button>
              </div>
            )}
            {days.map((d) => (
              <DayCard
                key={`${d.month}-${d.day}`}
                day={d}
                onOpenPod={(podId) => router.push(`/pods/${podId}`)}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Year view top row. */}
          <div className="flex items-center gap-2 px-4 pt-4">
            <button
              type="button"
              onClick={() => setView('agenda')}
              aria-label="Back to agenda"
              className="grid place-items-center w-11 h-11 rounded-full border-2 border-[var(--deep)] text-[var(--ink)] bg-transparent cursor-pointer"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 20 20"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 16l-6-6 6-6" />
              </svg>
            </button>
            <label htmlFor="month-search" className="sr-only">
              Date, month or event
            </label>
            <input
              id="month-search"
              type="search"
              value={monthQuery}
              onChange={(e) => setMonthQuery(e.target.value)}
              placeholder="Date, month or event"
              className="flex-1 rounded-full bg-[var(--pale)] px-4 min-h-[44px] text-base text-[var(--ink)] border-none"
            />
            <button
              type="button"
              aria-label="Suggest a plan"
              onClick={() => router.push('/hub/events')}
              className="grid place-items-center w-11 h-11 rounded-full border-2 border-[var(--deep)] text-[var(--ink)] bg-transparent cursor-pointer"
            >
              <span aria-hidden="true" className="text-xl leading-none">
                +
              </span>
            </button>
          </div>

          {/* Month grid. */}
          <div className="grid grid-cols-2 gap-3 px-4 py-4">
            {MONTHS.filter((m) =>
              m.toLowerCase().includes(monthQuery.trim().toLowerCase()),
            ).map((m, i) => {
              const isCurrent = m === 'Nov';
              const fill =
                MONTH_FILL[i % MONTH_FILL.length] ?? 'var(--card-pale)';
              const dark =
                fill === 'var(--card-deep)' || fill === 'var(--card-royal)';
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setView('agenda')}
                  aria-label={`${m}, open in agenda`}
                  className="hey-card p-3 cursor-pointer border-none text-center"
                  style={{
                    background: fill,
                    color: dark ? 'var(--white)' : 'var(--ink)',
                  }}
                >
                  <span className="block text-[20px] font-bold">{m}</span>
                  <span
                    aria-hidden="true"
                    className="mt-1 grid grid-cols-7 gap-y-1 text-[12px] font-semibold"
                  >
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, j) => (
                      <span key={`${d}${j}`}>{d}</span>
                    ))}
                    {Array.from({ length: 30 }, (_, d) => {
                      const isToday = isCurrent && d + 1 === 12;
                      return (
                        <span
                          key={d}
                          style={
                            isToday
                              ? {
                                  background: 'var(--orange)',
                                  color: 'var(--ink)',
                                  borderRadius: '50%',
                                }
                              : undefined
                          }
                        >
                          {d + 1}
                        </span>
                      );
                    })}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <p className="px-4 pb-8 text-[13px] text-[var(--ink-muted)]">
        The planner reads only free and busy time. Members never see each other
        calendars. Add to my calendar downloads an .ics file.
      </p>
    </main>
  );
}

function DayCard({
  day,
  onOpenPod,
}: {
  day: DayPlan;
  onOpenPod: (podId: string) => void;
}) {
  const fill = day.isToday
    ? { bg: 'var(--card-orange)', fg: 'var(--ink)' }
    : (WEEKDAY_FILL[day.weekday] ?? {
        bg: 'var(--card-pale)',
        fg: 'var(--ink)',
      });
  const hasPlans = day.plans.length > 0;
  return (
    <article
      className="hey-card flex"
      style={{
        background: fill.bg,
        color: fill.fg,
        minHeight: hasPlans ? 112 : 76,
      }}
      aria-label={`${day.weekday} ${day.month} ${day.day}${day.isToday ? ', today' : ''}`}
    >
      <div className="flex flex-col items-center justify-center w-[92px] shrink-0 py-3">
        <span className="text-[18px] font-semibold">{day.weekday}</span>
        <span className="text-[48px] font-bold leading-none tabular">
          {day.day}
        </span>
        <span className="text-[18px] font-semibold">{day.month}</span>
      </div>
      <div className="flex-1 flex py-3 pr-3">
        <TimeColumn
          label="9:00"
          plans={day.plans}
          slot="morning"
          onOpenPod={onOpenPod}
          dark={fill.fg === 'var(--white)'}
          needsDot
        />
        <TimeColumn
          label="12:30"
          plans={day.plans}
          slot="afternoon"
          onOpenPod={onOpenPod}
          dark={fill.fg === 'var(--white)'}
        />
        <TimeColumn
          label="8:00 PM"
          plans={day.plans}
          slot="evening"
          onOpenPod={onOpenPod}
          dark={fill.fg === 'var(--white)'}
        />
      </div>
    </article>
  );
}

function TimeColumn({
  label,
  plans,
  slot,
  onOpenPod,
  dark,
  needsDot,
}: {
  label: string;
  plans: typeof PLANS;
  slot: 'morning' | 'afternoon' | 'evening';
  onOpenPod: (podId: string) => void;
  dark: boolean;
  needsDot?: boolean;
}) {
  const mine = plans.filter((p) => {
    if (slot === 'morning') return p.time.includes('9:00 AM');
    if (slot === 'afternoon') return p.time.includes('11:00 AM');
    return p.time.includes('PM');
  });
  return (
    <div
      className="flex-1 px-2"
      style={{
        borderLeft: dark
          ? '1px solid rgb(255 255 255 / 0.3)'
          : '1px solid rgb(11 23 54 / 0.2)',
      }}
    >
      <p className="text-[13px] font-semibold">{label}</p>
      <div className="flex flex-col gap-1 mt-1">
        {mine.map((p) => {
          const pod = podById(p.podId);
          const tentative = p.state === 'poll_open' || p.state === 'ready_open';
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpenPod(p.podId)}
              aria-label={`${p.title}, ${pod.name}, ${p.date} ${p.time}${p.needsMe ? `, ${p.needsMeReason}` : ''}`}
              className="rounded-[14px] px-2 py-1 text-left text-[13px] font-semibold border-none cursor-pointer"
              style={{
                background: dark
                  ? 'rgb(255 255 255 / 0.18)'
                  : 'rgb(11 23 54 / 0.1)',
                border: tentative ? '2px dotted currentColor' : undefined,
                color: 'inherit',
              }}
            >
              {p.needsMe && needsDot !== false && (
                <span
                  aria-hidden="true"
                  className="inline-block w-2 h-2 rounded-full bg-[var(--orange)] mr-1"
                />
              )}
              {p.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
