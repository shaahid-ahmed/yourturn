'use client';
// P18 — Calendar
// Personal calendar + connected calendars. Planner reads free/busy only.
import { ScreenHeader, BackButton, Card, Button } from '@/components/ui';

const DEMO_EVENTS = [
  {
    id: 'e1',
    date: 'Thu Nov 19',
    time: '10 AM – 11 AM',
    title: 'Team standup',
    source: 'Work calendar',
    synthetic: false,
  },
  {
    id: 'e2',
    date: 'Thu Nov 19',
    time: '5:30 – 7:30 PM',
    title: 'High Line walk (pod: Friday crew)',
    source: 'Unspoken',
    synthetic: false,
  },
  {
    id: 'e3',
    date: 'Fri Nov 20',
    time: '7 – 10 PM',
    title: 'Brooklyn Bowl (pod: Friday crew)',
    source: 'Unspoken',
    synthetic: false,
  },
];

export default function CalendarPage() {
  return (
    <main className="flex flex-col min-h-dvh">
      <ScreenHeader title="Calendar" back={<BackButton href="/home" />} />

      <div className="px-4 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">
            November 2026
          </h2>
        </div>
        <p className="text-xs text-[var(--color-ink-muted)]">
          The planner reads only free/busy time. Members never see each other's
          calendars.
        </p>
      </div>

      {/* Connected calendars */}
      <div className="px-4 py-4 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">
          Connected calendars
        </h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)]">
            <div>
              <p className="text-sm font-medium text-[var(--color-ink)]">
                Google Calendar
              </p>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Syncing · free/busy only
              </p>
            </div>
            <Button variant="ghost">Disconnect</Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
          Apple Calendar and Outlook are coming later.
        </p>
      </div>

      {/* Upcoming events */}
      <div className="px-4 py-4">
        <h3 className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">
          Upcoming
        </h3>
        <div className="flex flex-col gap-3">
          {DEMO_EVENTS.map((e) => (
            <Card key={e.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {e.title}
                  </p>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    {e.date} · {e.time}
                  </p>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    {e.source}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
