'use client';
// P15, Pod details as a bottom sheet restyle: members, rhythm, group
// activities, notifications. Member names come from the seed.
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, ScreenHeader, BackButton } from '@/components/ui';
import { PODS, personName } from '@/lib/heypal/seed';

type Rhythm = 'weekly' | 'biweekly' | 'monthly';

const RHYTHM_LABELS: Record<Rhythm, string> = {
  weekly: 'Every week',
  biweekly: 'Every two weeks',
  monthly: 'Once a month',
};

export default function PodSettingsPage() {
  const params = useParams<{ podId: string }>();
  const podId = typeof params.podId === 'string' ? params.podId : 'pod-friday';
  const pod = PODS.find((p) => p.id === podId) ?? PODS[0];
  const [rhythm, setRhythm] = useState<Rhythm>('biweekly');
  const [activities, setActivities] = useState<string[]>([
    'Escape rooms',
    'Food markets',
  ]);
  const [newActivity, setNewActivity] = useState('');
  const [muted, setMuted] = useState(false);

  function addActivity() {
    if (!newActivity.trim()) return;
    setActivities((prev) => [...prev, newActivity.trim()]);
    setNewActivity('');
  }

  function removeActivity(a: string) {
    setActivities((prev) => prev.filter((x) => x !== a));
  }

  return (
    <main data-surface="white" className="flex flex-col min-h-dvh">
      <ScreenHeader
        title="Pod settings"
        back={<BackButton href={`/pods/${podId}`} />}
      />

      <div className="flex flex-col gap-6 px-4 py-5">
        <section aria-labelledby="members-heading">
          <h2
            id="members-heading"
            className="text-sm font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-3"
          >
            Members, {pod?.memberIds.length ?? 0}
          </h2>
          <ul
            className="hey-card bg-[var(--white)] border border-[var(--sky)] overflow-hidden flex flex-col"
            role="list"
          >
            {(pod?.memberIds ?? []).map((id) => (
              <li key={id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className="w-9 h-9 rounded-full bg-[var(--deep)] text-[var(--white)] flex items-center justify-center text-sm font-semibold shrink-0"
                  aria-hidden="true"
                >
                  {personName(id)[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--ink)]">
                    {id === 'p-me' ? 'You' : personName(id)}
                  </p>
                </div>
                {id === 'p-me' ? (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (
                        confirm(
                          'Leave this pod? Any open balances stay with the people involved until they are settled.',
                        )
                      )
                        window.location.href = '/home';
                    }}
                  >
                    Leave pod
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="rhythm-heading">
          <h2
            id="rhythm-heading"
            className="text-sm font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-3"
          >
            Meeting rhythm
          </h2>
          <div
            className="flex flex-col gap-2"
            role="radiogroup"
            aria-labelledby="rhythm-heading"
          >
            {(['weekly', 'biweekly', 'monthly'] as Rhythm[]).map((r) => (
              <label
                key={r}
                className={`flex items-center gap-3 p-4 rounded-[28px] border-2 cursor-pointer min-h-[52px] ${
                  rhythm === r
                    ? 'border-[var(--deep)] bg-[var(--pale)]'
                    : 'border-[var(--sky)]'
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
                <span
                  className="w-4 h-4 rounded-full border-2 border-[var(--blue-mid)] flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  {rhythm === r && (
                    <span className="w-2 h-2 rounded-full bg-[var(--blue-mid)]" />
                  )}
                </span>
                <span className="text-sm text-[var(--ink)]">
                  {RHYTHM_LABELS[r]}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-[var(--ink-muted)]">
            Propose a change in the chat. It becomes the default when everyone
            agrees.
          </p>
        </section>

        <section aria-labelledby="activities-heading">
          <h2
            id="activities-heading"
            className="text-sm font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-3"
          >
            Group activities
          </h2>
          <p className="text-[13px] text-[var(--ink-muted)] mb-3">
            Things this pod wants to do. The planner picks these over general
            interests.
          </p>
          <ul
            className="flex flex-wrap gap-2 mb-3"
            role="list"
            aria-label="Group activities"
          >
            {activities.map((a) => (
              <li
                key={a}
                className="flex items-center gap-1 bg-[var(--pale)] rounded-full pl-3 pr-2 py-1"
              >
                <span className="text-sm text-[var(--ink)]">{a}</span>
                <button
                  onClick={() => removeActivity(a)}
                  className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--ink-muted)] ml-1"
                  aria-label={`Remove ${a}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <label htmlFor="new-activity" className="sr-only">
              New group activity
            </label>
            <input
              id="new-activity"
              type="text"
              value={newActivity}
              onChange={(e) => setNewActivity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addActivity();
                }
              }}
              placeholder="Add an activity"
              className="flex-1 min-h-[44px] rounded-full border-2 border-[var(--sky)] px-4 text-sm text-[var(--ink)]"
            />
            <Button variant="secondary" onClick={addActivity}>
              Add
            </Button>
          </div>
        </section>

        <section aria-labelledby="mute-heading">
          <h2
            id="mute-heading"
            className="text-sm font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-3"
          >
            Notifications
          </h2>
          <label className="flex items-center justify-between gap-3 p-4 rounded-[28px] border-2 border-[var(--sky)] min-h-[52px] cursor-pointer">
            <span className="text-sm text-[var(--ink)]">Silence this pod</span>
            <input
              type="checkbox"
              checked={muted}
              onChange={(e) => setMuted(e.target.checked)}
              className="sr-only"
              aria-label="Silence notifications for this pod"
            />
            <div
              className="w-11 h-6 rounded-full relative"
              style={{ background: muted ? 'var(--deep)' : 'var(--sky)' }}
              aria-hidden="true"
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow"
                style={{
                  transform: muted ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </div>
          </label>
        </section>
      </div>
    </main>
  );
}
