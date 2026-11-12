'use client';
// P19, Profile: avatar, name, budget, dietary and availability summaries,
// interest chips with Edit interests, subscription row. White surface.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ScreenHeader,
  BackButton,
  Button,
  LockBadge,
  Card,
} from '@/components/ui';
import { HeyMenu } from '@/components/heypal';
import {
  MY_BUDGET_CENTS,
  PLAN_PRICE_CENTS,
  formatMoney,
} from '@/lib/heypal/seed';

const INTERESTS = [
  'ramen crawls',
  'jazz clubs',
  'pickup basketball',
  'board game cafes',
  'sunrise runs',
];

const MENU_ITEMS = [
  { href: '/home', label: 'home', note: 'Your pods' },
  { href: '/hub/profile', label: 'profile', note: 'Interests and limits' },
  { href: '/hub/calendar', label: 'calendar', note: 'Your week' },
  { href: '/money', label: 'money', note: 'What you owe and are owed' },
  { href: '/hub/settings', label: 'settings', note: 'Notifications, plan' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [editingInterests, setEditingInterests] = useState(false);
  const [interests, setInterests] = useState(INTERESTS);

  return (
    <main data-surface="white" className="flex flex-col min-h-dvh">
      <ScreenHeader
        title="Profile"
        back={<BackButton href="/home" />}
        right={
          <HeyMenu surface="white" items={MENU_ITEMS} current="/hub/profile" />
        }
      />

      <div className="flex flex-col gap-5 px-4 py-5">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full bg-[var(--deep)] text-[var(--white)] flex items-center justify-center text-2xl font-bold"
            aria-hidden="true"
          >
            J
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--ink)]">Janani</p>
            <p className="text-sm text-[var(--ink-muted)]">+1 (555) 010-0101</p>
            <p className="text-sm text-[var(--ink-muted)]">
              Weekends are for the pod
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => {
            router.push('/profile/create');
          }}
        >
          Edit profile
        </Button>

        <section aria-labelledby="interests-heading">
          <div className="flex items-center justify-between mb-2">
            <h2
              id="interests-heading"
              className="text-sm font-semibold text-[var(--ink-muted)] uppercase tracking-wide"
            >
              Your picks
            </h2>
            <Button
              variant="ghost"
              onClick={() => {
                if (editingInterests) {
                  setEditingInterests(false);
                } else {
                  router.push('/profile/create');
                }
              }}
            >
              Edit interests
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {interests.map((i) => (
              <span
                key={i}
                className="flex items-center gap-1 px-3 py-1 bg-[var(--pale)] rounded-full text-sm text-[var(--ink)]"
              >
                {i}
                {editingInterests && (
                  <button
                    onClick={() =>
                      setInterests((prev) => prev.filter((x) => x !== i))
                    }
                    className="ml-1 text-[var(--ink-muted)]"
                    aria-label={`Remove ${i}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        </section>

        <section aria-labelledby="limits-heading">
          <div className="flex flex-col items-start gap-1 mb-2">
            <h2
              id="limits-heading"
              className="text-sm font-semibold text-[var(--ink-muted)] uppercase tracking-wide"
            >
              Private limits
            </h2>
            <LockBadge />
          </div>
          <Card className="private-surface">
            <ul className="flex flex-col">
              <li className="flex items-center justify-between py-3">
                <span className="text-sm text-[var(--ink)]">
                  Budget per hangout
                </span>
                <span className="text-sm font-semibold text-[var(--ink)]">
                  {formatMoney(MY_BUDGET_CENTS).replace('.00', '')}
                </span>
              </li>
              <li className="flex items-center justify-between py-3">
                <span className="text-sm text-[var(--ink)]">Dietary needs</span>
                <span className="text-sm text-[var(--ink)]">Vegetarian</span>
              </li>
              <li className="flex items-center justify-between py-3">
                <span className="text-sm text-[var(--ink)]">Max travel</span>
                <span className="text-sm text-[var(--ink)]">45 min</span>
              </li>
            </ul>
            <Button
              variant="ghost"
              fullWidth
              className="mt-2"
              onClick={() => {
                router.push('/profile/create');
              }}
            >
              Edit private limits
            </Button>
          </Card>
          <p className="mt-2 text-[13px] text-[var(--ink-muted)]">
            Your limits are stored in your private planner vault. Your pod and
            the group chat never see them. Only your planner sees this.
          </p>
        </section>

        <section aria-labelledby="plan-heading">
          <h2
            id="plan-heading"
            className="text-sm font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-2"
          >
            Subscription
          </h2>
          <Card>
            <p className="text-sm font-medium text-[var(--ink)]">
              {formatMoney(PLAN_PRICE_CENTS).replace('.00', '')}/month · Active
            </p>
            <Button
              variant="ghost"
              fullWidth
              className="mt-2"
              onClick={() => {
                router.push('/hub/settings');
              }}
            >
              Manage subscription
            </Button>
          </Card>
        </section>
      </div>
    </main>
  );
}
