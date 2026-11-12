'use client';
// P5 — Home
// Floating pod bubbles. No cue ever names a single member's status.
import { useRef, useState } from 'react';
import { EmptyState, Button, useDocumentTitle } from '@/components/ui';

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

// Approximate positions on a 360–430-wide canvas
const BUBBLE_POSITIONS = [
  { top: '8%', left: '10%' },
  { top: '34%', left: '52%' },
  { top: '60%', left: '16%' },
];

// The private-ask dot belongs to the member, not to a pod: it lives on the
// hub entry (spec P5 "private chat badge"), with a text label in the sheet.
const PRIVATE_ASKS = DEMO_PODS.filter((p) => p.hasPrivateDot).length;

export default function HomePage() {
  useDocumentTitle('Your pods');
  const [pods] = useState<DemoPod[]>(DEMO_PODS);

  return (
    <main className="relative flex flex-col min-h-dvh bg-[var(--color-paper)]">
      <header className="px-[var(--gutter)] pt-6 pb-2">
        <h1 className="text-2xl text-[var(--color-ink)]">Your pods</h1>
      </header>

      {pods.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            heading="Start your first pod"
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
      ) : (
        <section
          className="relative flex-1"
          style={{ minHeight: 'calc(100dvh - 72px - 72px)' }}
          aria-label="Pods"
        >
          {pods.map((pod, i) => (
            <PodBubble
              key={pod.id}
              pod={pod}
              tone={(i % 6) + 1}
              position={
                BUBBLE_POSITIONS[i] ?? {
                  top: `${10 + i * 22}%`,
                  left: `${10 + (i % 2) * 40}%`,
                }
              }
            />
          ))}
        </section>
      )}

      <Dock />
    </main>
  );
}

function PodBubble({
  pod,
  tone,
  position,
}: {
  pod: DemoPod;
  tone: number;
  position: { top: string; left: string };
}) {
  const hasStage = pod.stage !== 'none';
  return (
    <a
      href={`/pods/${pod.id}`}
      className={`bubble bubble--${tone} absolute flex flex-col items-center justify-center text-center px-3`}
      style={{ ...position, width: 132, height: 132 }}
      aria-label={`${pod.name}, ${pod.memberCount} members${hasStage ? `, ${STAGE_LABEL[pod.stage]}` : ''}`}
    >
      <span className="text-base font-semibold leading-tight">{pod.name}</span>
      <span className="text-xs text-[var(--color-ink-muted)]">
        {pod.memberCount} people
      </span>
      {hasStage && (
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium">
          <span aria-hidden="true">●</span>
          {STAGE_LABEL[pod.stage]}
        </span>
      )}
    </a>
  );
}

// Bottom dock, in thumb reach: create a pod (centre) and the hub (right).
function Dock() {
  const hub = useRef<HTMLDialogElement>(null);
  return (
    <>
      <nav
        aria-label="Home actions"
        className="sticky bottom-0 grid grid-cols-3 items-center px-[var(--gutter)] bg-[var(--color-paper)]"
        style={{
          height: 'calc(var(--dock-height) + var(--safe-bottom))',
          paddingBottom: 'var(--safe-bottom)',
        }}
      >
        <span />
        <a
          href="/pods/create"
          className="justify-self-center w-14 h-14 rounded-full bg-[var(--color-action)] text-[var(--color-on-action)] flex items-center justify-center shadow-[var(--shadow-card)] active:bg-[var(--color-action-pressed)]"
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
        <button
          type="button"
          onClick={() => hub.current?.showModal()}
          className="justify-self-end relative inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 min-h-[48px] text-sm font-medium text-[var(--color-ink)]"
          aria-haspopup="dialog"
          aria-label={PRIVATE_ASKS ? `Hub, ${PRIVATE_ASKS} private ask` : 'Hub'}
        >
          Hub
          {PRIVATE_ASKS > 0 && (
            <span
              className="w-2.5 h-2.5 rounded-full bg-[var(--color-private)]"
              aria-hidden="true"
            />
          )}
        </button>
      </nav>
      <HubSheet dialog={hub} />
    </>
  );
}

// The hub (spec P5, P15–P22) as a bottom sheet. <dialog> gives focus
// containment, Escape to close and focus return to the Hub button.
function HubSheet({
  dialog,
}: {
  dialog: React.RefObject<HTMLDialogElement | null>;
}) {
  const items = [
    ...(PRIVATE_ASKS
      ? [
          {
            href: '/hub/planner',
            label: 'Private planner chat',
            note: `${PRIVATE_ASKS} private ask waiting`,
          },
        ]
      : []),
    { href: '/money', label: 'Money', note: 'What you owe and are owed' },
    { href: '/hub/events', label: 'Events', note: 'Things to do in NYC' },
    {
      href: '/hub/calendar',
      label: 'Calendar',
      note: 'Your week and hangouts',
    },
    {
      href: '/hub/profile',
      label: 'Profile',
      note: 'Interests and private limits',
    },
    ...(PRIVATE_ASKS
      ? []
      : [
          {
            href: '/hub/planner',
            label: 'Private planner chat',
            note: 'Just you and your planner',
          },
        ]),
    {
      href: '/hub/payment-methods',
      label: 'Payment methods',
      note: 'Your linked PayPal',
    },
    {
      href: '/hub/settings',
      label: 'Settings',
      note: 'Notifications, privacy, plan',
    },
  ];
  return (
    <dialog
      ref={dialog}
      aria-labelledby="hub-title"
      className="m-0 mt-auto w-full max-w-[var(--layout-max)] mx-auto rounded-t-[var(--radius-sheet)] bg-[var(--color-surface)] p-0 shadow-[var(--shadow-sheet)] backdrop:bg-black/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="flex items-center justify-between px-[var(--gutter)] pt-4 pb-2">
        <h2 id="hub-title" className="text-xl font-semibold">
          Hub
        </h2>
        <button
          type="button"
          onClick={() => dialog.current?.close()}
          className="rounded-full px-4 min-h-[44px] text-sm font-medium text-[var(--color-ink)]"
        >
          Close
        </button>
      </div>
      <ul className="pb-[calc(16px+var(--safe-bottom))]">
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="flex flex-col justify-center px-[var(--gutter)] min-h-[56px] border-t border-[var(--color-hairline)]"
            >
              <span className="text-base font-medium text-[var(--color-ink)]">
                {item.label}
              </span>
              <span className="text-xs text-[var(--color-ink-muted)]">
                {item.note}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
