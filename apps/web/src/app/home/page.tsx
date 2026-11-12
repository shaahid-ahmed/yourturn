'use client';
// P5 — Home
// Floating pod bubbles. No cue ever names a single member's status.
import { useState } from 'react';
import { EmptyState, Button } from '@/components/ui';

type PodStage =
  'none' | 'planning' | 'poll_open' | 'booking_pending' | 'payments_open';

interface DemoPod {
  id: string;
  name: string;
  memberCount: number;
  stage: PodStage;
  hasPrivateDot: boolean;
}

const STAGE_LABEL: Record<PodStage, string> = {
  none: '',
  planning: 'Planning',
  poll_open: 'Poll open',
  booking_pending: 'Booking pending',
  payments_open: 'Payments open',
};

// Synthetic demo pods
const DEMO_PODS: DemoPod[] = [
  {
    id: 'pod-1',
    name: 'Friday crew',
    memberCount: 4,
    stage: 'poll_open',
    hasPrivateDot: false,
  },
  {
    id: 'pod-2',
    name: 'Work pals',
    memberCount: 3,
    stage: 'planning',
    hasPrivateDot: true,
  },
  {
    id: 'pod-3',
    name: 'Cousins',
    memberCount: 5,
    stage: 'none',
    hasPrivateDot: false,
  },
];

// Approximate positions on a 390-wide canvas
const BUBBLE_POSITIONS = [
  { top: '18%', left: '12%' },
  { top: '42%', left: '58%' },
  { top: '64%', left: '22%' },
];

export default function HomePage() {
  const [pods] = useState<DemoPod[]>(DEMO_PODS);

  if (pods.length === 0) {
    return (
      <main className="flex flex-col min-h-dvh">
        <HubBar />
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon="✦"
            heading="Your first pod is waiting"
            body="A pod is a friend group of 3–8 people. Create one to start planning together."
            action={
              <Button
                onClick={() => {
                  window.location.href = '/pods/create';
                }}
              >
                Create a pod
              </Button>
            }
          />
        </div>
        <PlusButton />
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[var(--color-surface)]">
      <HubBar />

      {/* Bubble field */}
      <section
        className="relative"
        style={{ height: 'calc(100dvh - 112px)' }}
        aria-label="Your pods"
      >
        {pods.map((pod, i) => (
          <PodBubble
            key={pod.id}
            pod={pod}
            position={
              BUBBLE_POSITIONS[i] ?? {
                top: `${20 + i * 25}%`,
                left: `${10 + i * 20}%`,
              }
            }
          />
        ))}
      </section>

      <PlusButton />
    </main>
  );
}

function PodBubble({
  pod,
  position,
}: {
  pod: DemoPod;
  position: { top: string; left: string };
}) {
  const hasStage = pod.stage !== 'none';
  return (
    <a
      href={`/pods/${pod.id}`}
      className="absolute flex flex-col items-center gap-1.5 group"
      style={position}
      aria-label={`${pod.name}, ${pod.memberCount} members${hasStage ? `, ${STAGE_LABEL[pod.stage]}` : ''}`}
    >
      {/* Bubble */}
      <div
        className="relative flex items-center justify-center rounded-full bg-[var(--color-accent)] text-white font-semibold text-sm shadow-lg transition-transform group-hover:scale-105 group-active:scale-95"
        style={{ width: 80, height: 80 }}
        aria-hidden="true"
      >
        {pod.name.slice(0, 2).toUpperCase()}
        {pod.hasPrivateDot && (
          <span
            className="absolute top-1 right-1 w-3 h-3 rounded-full bg-[#F5A623] border-2 border-white"
            aria-hidden="true"
            title="Planner has asked you something privately"
          />
        )}
      </div>

      {/* Label */}
      <div className="text-center max-w-[90px]">
        <p className="text-xs font-medium text-[var(--color-ink)] truncate">
          {pod.name}
        </p>
        <p className="text-xs text-[var(--color-ink-muted)]">
          {pod.memberCount} members
        </p>
        {hasStage && (
          <p className="text-xs text-[var(--color-accent)] font-medium">
            {STAGE_LABEL[pod.stage]}
          </p>
        )}
      </div>
    </a>
  );
}

function PlusButton() {
  return (
    <a
      href="/pods/create"
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center shadow-xl hover:bg-[#174F76] active:scale-95 transition-all"
      aria-label="Create a new pod"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </a>
  );
}

function HubBar() {
  const items = [
    { href: '/hub/events', label: 'Events', icon: '🗺' },
    { href: '/hub/calendar', label: 'Calendar', icon: '📅' },
    { href: '/hub/money', label: 'Money', icon: '💸' },
    { href: '/hub/profile', label: 'Profile', icon: '👤' },
  ];
  return (
    <nav
      aria-label="Hub navigation"
      className="flex items-center justify-around px-2 h-14 border-b border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
          aria-label={item.label}
        >
          <span aria-hidden="true" className="text-lg">
            {item.icon}
          </span>
          <span className="text-xs">{item.label}</span>
        </a>
      ))}
    </nav>
  );
}
