'use client';
// P4 — Profile creation
// Six-step stepper: basics, interests, private limits, calendar, PayPal, permissions.
// Every answer editable later from P19 (Profile hub screen).
import { useState } from 'react';
import { Button, Input, StepIndicator, LockBadge } from '@/components/ui';

const INTEREST_OPTIONS = [
  'Bowling', 'Comedy', 'Escape rooms', 'Food markets', 'Museums',
  'Outdoor walks', 'Live music', 'Restaurants', 'Sports', 'Theatre',
];

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Halal', 'Kosher', 'None'];

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export default function ProfileCreatePage() {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [budgetDollars, setBudgetDollars] = useState('');
  const [dietary, setDietary] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState('');
  const [maxTravel, setMaxTravel] = useState('');
  const [nameError, setNameError] = useState('');
  const [budgetError, setBudgetError] = useState('');

  function toggleInterest(i: string) {
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  }
  function toggleDietary(d: string) {
    setDietary(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  function next() { setStep(s => Math.min(6, s + 1) as Step); }
  function back() { setStep(s => Math.max(1, s - 1) as Step); }

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setNameError('Name is required.'); return; }
    setNameError('');
    next();
  }

  function handleStep3(e: React.FormEvent) {
    e.preventDefault();
    const dollars = Number(budgetDollars);
    if (!budgetDollars || isNaN(dollars) || dollars < 1 || dollars > 200 || !Number.isInteger(dollars)) {
      setBudgetError('Enter a whole dollar amount between $1 and $200.');
      return;
    }
    setBudgetError('');
    next();
  }

  const stepTitles: Record<Step, string> = {
    1: 'The basics',
    2: 'Your interests',
    3: 'Private limits',
    4: 'Calendar',
    5: 'PayPal',
    6: 'Permissions',
  };

  return (
    <main className="flex flex-col min-h-dvh px-6 pt-8 pb-8">
      <div className="mb-6">
        <StepIndicator current={step} total={6} />
        <h1 className="mt-3 text-xl font-bold text-[var(--color-ink)]">{stepTitles[step]}</h1>
        {step === 3 && (
          <p className="mt-1 text-sm text-[var(--color-ink-muted)] flex items-center gap-2">
            <LockBadge />
          </p>
        )}
      </div>

      {/* Step 1 — Basics */}
      {step === 1 && (
        <form onSubmit={handleStep1} className="flex flex-col gap-5">
          <Input
            label="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            error={nameError}
            autoComplete="name"
            placeholder="Alex"
          />
          <Input
            label="Bio (optional)"
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="A few words about you"
          />
          <p className="text-xs text-[var(--color-ink-muted)]">
            Your phone number is prefilled from sign-in and not shown to pods.
          </p>
          <div className="mt-auto">
            <Button type="submit" fullWidth>Next</Button>
          </div>
        </form>
      )}

      {/* Step 2 — Interests */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Pick everything you like. Your planner uses these to suggest plans. You can change them later.
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Select your interests">
            {INTEREST_OPTIONS.map(i => (
              <button
                key={i}
                type="button"
                onClick={() => toggleInterest(i)}
                aria-pressed={interests.includes(i)}
                className={`px-4 py-2 rounded-full text-sm border transition-colors min-h-[44px] ${
                  interests.includes(i)
                    ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                    : 'bg-transparent text-[var(--color-ink)] border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)]'
                }`}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-auto">
            <Button variant="secondary" fullWidth onClick={back}>Back</Button>
            <Button fullWidth onClick={next}>Next</Button>
          </div>
        </div>
      )}

      {/* Step 3 — Private limits */}
      {step === 3 && (
        <form onSubmit={handleStep3} className="flex flex-col gap-5">
          <div className="rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border)] p-3 text-xs text-[var(--color-ink-muted)]">
            Everything on this screen is stored in your private planner vault. Your pod and the group chat never see these details.
          </div>
          <Input
            label="Budget per hangout (whole dollars)"
            type="number"
            inputMode="numeric"
            hint="$1–$200. Only you and your planner see this."
            value={budgetDollars}
            onChange={e => setBudgetDollars(e.target.value)}
            error={budgetError}
            placeholder="30"
          />
          <div>
            <p className="text-sm font-medium text-[var(--color-ink)] mb-2">Dietary needs (optional)</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Dietary needs">
              {DIETARY_OPTIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDietary(d)}
                  aria-pressed={dietary.includes(d)}
                  className={`px-3 py-1.5 rounded-full text-sm border min-h-[44px] transition-colors ${
                    dietary.includes(d)
                      ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                      : 'bg-transparent text-[var(--color-ink)] border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Things you dislike (optional)"
            value={dislikes}
            onChange={e => setDislikes(e.target.value)}
            placeholder="e.g. loud bars, karaoke"
            hint="Only you and your planner see this."
          />
          <Input
            label="Longest travel (minutes, optional)"
            type="number"
            inputMode="numeric"
            value={maxTravel}
            onChange={e => setMaxTravel(e.target.value)}
            placeholder="45"
            hint="Max commute you're comfortable with. Only you and your planner see this."
          />
          <div className="flex gap-3 mt-auto">
            <Button variant="secondary" fullWidth onClick={back} type="button">Back</Button>
            <Button fullWidth type="submit">Next</Button>
          </div>
        </form>
      )}

      {/* Step 4 — Calendar */}
      {step === 4 && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Connect Google Calendar so the planner can find times when everyone is free. The planner reads only free/busy — it never shows members each other's calendars.
          </p>
          <div className="rounded-xl border border-[var(--color-border)] p-4 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[var(--color-ink)]">Google Calendar</span>
            <Button variant="secondary" onClick={next}>Connect</Button>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Other calendar sources are open. You can connect or disconnect later from your profile.
          </p>
          <div className="flex gap-3 mt-auto">
            <Button variant="secondary" fullWidth onClick={back}>Back</Button>
            <Button variant="ghost" fullWidth onClick={next}>Skip for now</Button>
          </div>
        </div>
      )}

      {/* Step 5 — PayPal */}
      {step === 5 && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Link your PayPal account to pay or be paid in a hangout. Required before you can be the payer for a hangout.
          </p>
          <div className="rounded-xl border border-[var(--color-border)] p-4 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[var(--color-ink)]">PayPal</span>
            <Button variant="secondary" onClick={next}>Link PayPal</Button>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)]">
            This is a demo — no PayPal account is created or charged.
          </p>
          <div className="flex gap-3 mt-auto">
            <Button variant="secondary" fullWidth onClick={back}>Back</Button>
            <Button variant="ghost" fullWidth onClick={next}>Skip for now</Button>
          </div>
        </div>
      )}

      {/* Step 6 — Permissions */}
      {step === 6 && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Each permission has a reason. You can change these at any time from Settings.
          </p>
          <ul className="flex flex-col gap-3" role="list">
            {[
              {
                label: 'Contacts',
                reason: 'To build pods from people you already know. If you decline, you can still invite people with a link.',
              },
              {
                label: 'Notifications',
                reason: 'For polls, booking confirmations, and balance reminders. Never used for streaks or pressure.',
              },
              {
                label: 'Calendar',
                reason: 'To find free/busy slots without exposing calendars to other members.',
              },
            ].map(({ label, reason }) => (
              <li
                key={label}
                className="rounded-xl border border-[var(--color-border)] p-4"
              >
                <p className="text-sm font-medium text-[var(--color-ink)] mb-1">{label}</p>
                <p className="text-xs text-[var(--color-ink-muted)]">{reason}</p>
              </li>
            ))}
          </ul>
          <div className="flex gap-3 mt-auto">
            <Button variant="secondary" fullWidth onClick={back}>Back</Button>
            <Button
              fullWidth
              onClick={() => { window.location.href = '/home'; }}
            >
              Allow and continue
            </Button>
          </div>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => { window.location.href = '/home'; }}
          >
            Decline all and continue
          </Button>
        </div>
      )}
    </main>
  );
}
