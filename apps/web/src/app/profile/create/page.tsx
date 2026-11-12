'use client';
// P4, Profile creation: six calm steps with a DotProgress on top.
// The interests step is a Spotify style curation screen: search, category
// chips, a tangle of overlapping palette pills, and a pinned tray.
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Input,
  StepIndicator,
  LockBadge,
  useDocumentTitle,
} from '@/components/ui';
import { cardFill, cardText } from '@/components/heypal';

interface Interest {
  id: string;
  label: string;
  category: string;
}

const CATEGORIES = [
  'Food and drink',
  'Music',
  'Movies and shows',
  'Nightlife',
  'Outdoors',
  'Sports to play',
  'Sports to watch',
  'Arts and museums',
  'Games and puzzles',
  'Wellness',
  'Comedy and talks',
  'Cozy at home',
];

const LABELS: Record<string, string[]> = {
  'Food and drink': [
    'ramen crawls',
    'rooftop bars',
    'dumpling crawls',
    'food markets',
    'taco trucks',
    'wine bars',
  ],
  Music: [
    'jazz clubs',
    'live gigs',
    'open mic nights',
    'karaoke',
    'vinyl swaps',
    'choir singing',
  ],
  'Movies and shows': [
    'cult classics',
    'rooftop movies',
    'documentaries',
    'indie premieres',
    'theatre nights',
    'horror marathons',
  ],
  Nightlife: [
    'dance floors',
    'cocktail dens',
    'late galleries',
    'pub quizzes',
    'club nights',
    'rooftop parties',
  ],
  Outdoors: [
    'sunrise runs',
    'long hikes',
    'picnics',
    'bike rides',
    'kayaking',
    'stargazing',
  ],
  'Sports to play': [
    'pickup basketball',
    'bouldering',
    'tennis ladders',
    '5-a-side',
    'swim sessions',
    'skate parks',
  ],
  'Sports to watch': [
    'match nights',
    'fight nights',
    'track meets',
    'derby days',
    'finals parties',
    'away days',
  ],
  'Arts and museums': [
    'gallery hops',
    'thrifting',
    'pottery',
    'photo walks',
    'zine fairs',
    'life drawing',
  ],
  'Games and puzzles': [
    'board game cafes',
    'escape rooms',
    'pub trivia',
    'chess clubs',
    'video game nights',
    'jigsaw races',
  ],
  Wellness: [
    'yoga flows',
    'sauna sessions',
    'morning swims',
    'meditation',
    'spa days',
    'sound baths',
  ],
  'Comedy and talks': [
    'standup nights',
    'story slams',
    'lectures',
    'book clubs',
    'poetry nights',
    'debate clubs',
  ],
  'Cozy at home': [
    'movie nights',
    'cook together',
    'game nights',
    'record club',
    'craft nights',
    'tea tastings',
  ],
};

const TAXONOMY: Interest[] = CATEGORIES.flatMap((category, ci) =>
  (LABELS[category] ?? []).map((label, li) => ({
    id: `in-${ci}-${li}`,
    label,
    category,
  })),
);

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Halal',
  'Kosher',
  'None',
];

const MIN_PICKS = 5;

type Step = 1 | 2 | 3 | 4 | 5 | 6;

// Seeded tilt so the cloud is identical every visit. Never drifts.
function tilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 97;
  return (h % 25) - 12;
}

export default function ProfileCreatePage() {
  const router = useRouter();
  useDocumentTitle('Create your profile');
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [customName, setCustomName] = useState('');
  const [category, setCategory] = useState('All');
  const [interestQuery, setInterestQuery] = useState('');
  const [budgetDollars, setBudgetDollars] = useState('');
  const [dietary, setDietary] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState('');
  const [maxTravel, setMaxTravel] = useState('');
  const [nameError, setNameError] = useState('');
  const [budgetError, setBudgetError] = useState('');

  function toggleInterest(id: string) {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }
  function toggleDietary(d: string) {
    setDietary((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  function next() {
    setStep((s) => Math.min(6, s + 1) as Step);
  }
  function back() {
    setStep((s) => Math.max(1, s - 1) as Step);
  }

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Name is required.');
      return;
    }
    setNameError('');
    next();
  }

  function handleStep3(e: React.FormEvent) {
    e.preventDefault();
    const dollars = Number(budgetDollars);
    if (
      !budgetDollars ||
      isNaN(dollars) ||
      dollars < 1 ||
      dollars > 200 ||
      !Number.isInteger(dollars)
    ) {
      setBudgetError('Enter a whole dollar amount between $1 and $200.');
      return;
    }
    setBudgetError('');
    next();
  }

  const visibleInterests = useMemo(() => {
    const q = interestQuery.trim().toLowerCase();
    return TAXONOMY.filter(
      (t) =>
        (category === 'All' || t.category === category) &&
        (!q || t.label.toLowerCase().includes(q)),
    ).slice(0, 60);
  }, [category, interestQuery]);

  const stepTitles: Record<Step, string> = {
    1: 'The basics',
    2: 'What are you into?',
    3: 'Private limits',
    4: 'Calendar',
    5: 'PayPal',
    6: 'Permissions',
  };

  return (
    <main
      data-surface="white"
      className="flex flex-col min-h-dvh px-5 pt-8 pb-8"
    >
      <div className="mb-6">
        <StepIndicator current={step} total={6} />
        <h1 className="mt-3 text-[32px] font-bold text-[var(--ink)]">
          {stepTitles[step]}
        </h1>
        {step === 2 && (
          <p className="mt-1 text-base text-[var(--ink-muted)]">
            Pick at least 5. The more you pick, the better your plans.
          </p>
        )}
        {step === 3 && (
          <p className="mt-1 text-sm text-[var(--ink-muted)] flex items-center gap-2">
            <LockBadge />
          </p>
        )}
      </div>

      {step === 1 && (
        <form onSubmit={handleStep1} className="flex flex-col gap-5">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={nameError}
            autoComplete="name"
            placeholder="Janani"
          />
          <Input
            label="Bio (optional)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A few words about you"
          />
          <p className="text-[13px] text-[var(--ink-muted)]">
            Your phone number is prefilled from sign-in and not shown to pods.
          </p>
          <div className="mt-auto">
            <Button type="submit" fullWidth>
              Next
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4 flex-1">
          <label htmlFor="interest-search" className="sr-only">
            Search interests
          </label>
          <input
            id="interest-search"
            type="search"
            value={interestQuery}
            onChange={(e) => setInterestQuery(e.target.value)}
            placeholder="Search what you love"
            className="w-full rounded-full bg-[var(--pale)] px-4 min-h-[44px] text-base text-[var(--ink)] border-none"
          />
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            role="group"
            aria-label="Interest categories"
          >
            {['All', ...CATEGORIES].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`shrink-0 rounded-full px-4 min-h-[44px] text-sm font-semibold border-none cursor-pointer ${
                  category === c
                    ? 'bg-[var(--deep)] text-[var(--white)]'
                    : 'bg-transparent text-[var(--ink)] border-2 border-[var(--blue-mid)]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Pick your interests"
          >
            {visibleInterests.map((t, i) => {
              const on = interests.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => toggleInterest(t.id)}
                  className="rounded-full px-4 min-h-[44px] text-[18px] font-bold border-none cursor-pointer"
                  style={{
                    background: on ? 'var(--deep)' : cardFill(i),
                    color: on ? 'var(--white)' : cardText(i),
                    transform: on ? 'rotate(0deg)' : `rotate(${tilt(t.id)}deg)`,
                  }}
                >
                  {on && <span aria-hidden="true">✓ </span>}
                  {t.label}
                </button>
              );
            })}
          </div>
          {visibleInterests.length === 0 && (
            <div className="flex flex-col gap-2 items-start">
              <p className="text-base text-[var(--ink)]">
                No match. Add it as your own.
              </p>
              <div className="flex gap-2 w-full">
                <label htmlFor="custom-interest" className="sr-only">
                  Your own interest
                </label>
                <input
                  id="custom-interest"
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Your own interest"
                  className="flex-1 rounded-full bg-[var(--pale)] px-4 min-h-[44px] text-base text-[var(--ink)] border-none"
                />
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    if (customName.trim()) setCustomName('');
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          <div
            className="sticky bottom-0 bg-[var(--white)] pt-2 pb-1"
            aria-live="polite"
          >
            <p className="text-base font-semibold text-[var(--ink)]">
              {interests.length} picked
              {interests.length < MIN_PICKS
                ? `, pick ${MIN_PICKS - interests.length} more`
                : ''}
            </p>
            <StepIndicator
              current={Math.min(interests.length, MIN_PICKS)}
              total={MIN_PICKS}
            />
            <div className="flex gap-3 mt-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={back}
                type="button"
              >
                Back
              </Button>
              <Button
                fullWidth
                onClick={next}
                disabled={interests.length < MIN_PICKS}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleStep3} className="flex flex-col gap-5">
          <div className="private-surface rounded-[28px] border border-[var(--color-hairline)] p-4 text-[13px]">
            Everything on this screen is stored in your private planner vault.
            Your pod and the group chat never see these details. Only your
            planner sees this.
          </div>
          <Input
            label="Budget per hangout (whole dollars)"
            type="number"
            inputMode="numeric"
            hint="From $1 to $200. Only you and your planner see this."
            value={budgetDollars}
            onChange={(e) => setBudgetDollars(e.target.value)}
            error={budgetError}
            placeholder="40"
          />
          <div>
            <p className="text-sm font-medium text-[var(--ink)] mb-2">
              Dietary needs (optional)
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Dietary needs"
            >
              {DIETARY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDietary(d)}
                  aria-pressed={dietary.includes(d)}
                  className={`px-3 py-1.5 rounded-full text-sm border min-h-[44px] cursor-pointer ${
                    dietary.includes(d)
                      ? 'bg-[var(--deep)] text-[var(--white)] border-[var(--deep)]'
                      : 'bg-transparent text-[var(--ink)] border-[var(--color-border)]'
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
            onChange={(e) => setDislikes(e.target.value)}
            placeholder="loud bars, karaoke"
            hint="Only you and your planner see this."
          />
          <Input
            label="Longest travel (minutes, optional)"
            type="number"
            inputMode="numeric"
            value={maxTravel}
            onChange={(e) => setMaxTravel(e.target.value)}
            placeholder="45"
            hint="Max commute you are comfortable with. Only you and your planner see this."
          />
          <div className="flex gap-3 mt-auto">
            <Button variant="secondary" fullWidth onClick={back} type="button">
              Back
            </Button>
            <Button fullWidth type="submit">
              Next
            </Button>
          </div>
        </form>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-5">
          <p className="text-base text-[var(--ink-muted)]">
            Connect Google Calendar so the planner can find times when everyone
            is free. The planner reads only free and busy time. It never shows
            members each other calendars.
          </p>
          <div className="hey-card bg-[var(--pale)] p-4 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[var(--ink)]">
              Google Calendar
            </span>
            <Button variant="secondary" onClick={next}>
              Connect
            </Button>
          </div>
          <p className="text-[13px] text-[var(--ink-muted)]">
            Apple Calendar and Outlook are coming later. You can connect or
            disconnect later from your profile.
          </p>
          <div className="flex gap-3 mt-auto">
            <Button variant="secondary" fullWidth onClick={back}>
              Back
            </Button>
            <Button variant="ghost" fullWidth onClick={next}>
              Skip for now
            </Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-5">
          <p className="text-base text-[var(--ink-muted)]">
            Link your PayPal account to pay or be paid in a hangout. Required
            before you can be the payer for a hangout.
          </p>
          <div className="hey-card bg-[var(--pale)] p-4 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[var(--ink)]">
              PayPal
            </span>
            <Button variant="secondary" onClick={next}>
              Link PayPal
            </Button>
          </div>
          <p className="text-[13px] text-[var(--ink-muted)]">
            This is a demo, and no PayPal account is created or charged.
          </p>
          <div className="flex gap-3 mt-auto">
            <Button variant="secondary" fullWidth onClick={back}>
              Back
            </Button>
            <Button variant="ghost" fullWidth onClick={next}>
              Skip for now
            </Button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="flex flex-col gap-5">
          <p className="text-base text-[var(--ink-muted)]">
            Each permission has a reason. You can change these at any time from
            Settings.
          </p>
          <ul className="flex flex-col gap-3" role="list">
            {[
              {
                label: 'Contacts',
                reason:
                  'To build pods from people you already know. If you decline, you can still invite people with a link.',
              },
              {
                label: 'Notifications',
                reason:
                  'For polls, booking confirmations, and balance reminders. Never used for streaks or pressure.',
              },
              {
                label: 'Calendar',
                reason:
                  'To find free and busy slots without exposing calendars to other members.',
              },
            ].map(({ label, reason }) => (
              <li
                key={label}
                className="hey-card bg-[var(--white)] border border-[var(--sky)] p-4"
              >
                <p className="text-sm font-medium text-[var(--ink)] mb-1">
                  {label}
                </p>
                <p className="text-[13px] text-[var(--ink-muted)]">{reason}</p>
              </li>
            ))}
          </ul>
          <div className="flex gap-3 mt-auto">
            <Button variant="secondary" fullWidth onClick={back}>
              Back
            </Button>
            <Button
              fullWidth
              onClick={() => {
                router.push('/home');
              }}
            >
              Allow and continue
            </Button>
          </div>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              router.push('/home');
            }}
          >
            Decline all and continue
          </Button>
        </div>
      )}
    </main>
  );
}
