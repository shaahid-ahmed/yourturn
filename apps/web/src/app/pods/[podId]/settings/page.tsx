'use client';
// P8 — Pod settings
// Members, meeting rhythm, group activities, mute.
import { useState } from 'react';
import { Button, ScreenHeader, BackButton } from '@/components/ui';

type Rhythm = 'weekly' | 'biweekly' | 'monthly';

const RHYTHM_LABELS: Record<Rhythm, string> = {
  weekly: 'Every week',
  biweekly: 'Every two weeks',
  monthly: 'Once a month',
};

const DEMO_MEMBERS = [
  { id: 'me', name: 'You', isCreator: false },
  { id: 'sam', name: 'Sam', isCreator: true },
  { id: 'priya', name: 'Priya', isCreator: false },
  { id: 'alex', name: 'Alex', isCreator: false },
];

export default function PodSettingsPage() {
  const [rhythm, setRhythm] = useState<Rhythm>('biweekly');
  const [activities, setActivities] = useState<string[]>(['Escape rooms', 'Food markets']);
  const [newActivity, setNewActivity] = useState('');
  const [muted, setMuted] = useState(false);

  function addActivity() {
    if (!newActivity.trim()) return;
    setActivities(prev => [...prev, newActivity.trim()]);
    setNewActivity('');
  }

  function removeActivity(a: string) {
    setActivities(prev => prev.filter(x => x !== a));
  }

  return (
    <main className="flex flex-col min-h-dvh">
      <ScreenHeader
        title="Pod settings"
        back={<BackButton href="/pods/pod-1" />}
      />

      <div className="flex flex-col gap-6 px-4 py-5">
        {/* Members */}
        <section aria-labelledby="members-heading">
          <h2 id="members-heading" className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">Members</h2>
          <ul className="flex flex-col divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] overflow-hidden" role="list">
            {DEMO_MEMBERS.map(m => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center text-sm font-semibold shrink-0" aria-hidden="true">
                  {m.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--color-ink)]">{m.name}</p>
                  {m.isCreator && <p className="text-xs text-[var(--color-ink-muted)]">Creator</p>}
                </div>
                {m.id === 'me' ? (
                  <Button variant="destructive" onClick={() => { if (confirm('Leave Friday crew? Rotation consequences are suspended until resolved.')) window.location.href = '/home'; }}>
                    Leave pod
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {/* Meeting rhythm */}
        <section aria-labelledby="rhythm-heading">
          <h2 id="rhythm-heading" className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">Meeting rhythm</h2>
          <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby="rhythm-heading">
            {(['weekly', 'biweekly', 'monthly'] as Rhythm[]).map(r => (
              <label
                key={r}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer min-h-[52px] transition-colors ${
                  rhythm === r
                    ? 'border-[var(--color-accent)] bg-[#EBF3FA]'
                    : 'border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)]'
                }`}
              >
                <input
                  type="radio"
                  name="rhythm"
                  value={r}
                  checked={rhythm === r}
                  onChange={() => setRhythm(r)}
                  className="sr-only"
                />
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${rhythm === r ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]'}`} aria-hidden="true">
                  {rhythm === r && <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />}
                </span>
                <span className="text-sm text-[var(--color-ink)]">{RHYTHM_LABELS[r]}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">How agreement is reached is open (section 12 of the spec).</p>
        </section>

        {/* Group activities */}
        <section aria-labelledby="activities-heading">
          <h2 id="activities-heading" className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">Group activities</h2>
          <p className="text-xs text-[var(--color-ink-muted)] mb-3">Things this pod wants to do. The planner picks these over general interests.</p>
          <ul className="flex flex-wrap gap-2 mb-3" role="list" aria-label="Group activities">
            {activities.map(a => (
              <li key={a} className="flex items-center gap-1 bg-[var(--color-surface-sunken)] border border-[var(--color-border)] rounded-full pl-3 pr-2 py-1">
                <span className="text-sm text-[var(--color-ink)]">{a}</span>
                <button
                  onClick={() => removeActivity(a)}
                  className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--color-border)] text-[var(--color-ink-muted)] ml-1"
                  aria-label={`Remove ${a}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              type="text"
              value={newActivity}
              onChange={e => setNewActivity(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addActivity(); } }}
              placeholder="Add an activity"
              className="flex-1 min-h-[44px] rounded-xl border border-[var(--color-border)] px-4 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
              aria-label="New group activity"
            />
            <Button variant="secondary" onClick={addActivity}>Add</Button>
          </div>
        </section>

        {/* Mute */}
        <section aria-labelledby="mute-heading">
          <h2 id="mute-heading" className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">Notifications</h2>
          <label className="flex items-center justify-between gap-3 p-4 rounded-xl border border-[var(--color-border)] min-h-[52px] cursor-pointer">
            <span className="text-sm text-[var(--color-ink)]">Silence this pod</span>
            <input
              type="checkbox"
              checked={muted}
              onChange={e => setMuted(e.target.checked)}
              className="sr-only"
              aria-label="Silence notifications for this pod"
            />
            <div
              className={`w-11 h-6 rounded-full transition-colors relative ${muted ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'}`}
              aria-hidden="true"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${muted ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </label>
        </section>
      </div>
    </main>
  );
}
