'use client';
// P5, Home on deep blue. Five translucent pods in fixed slots, an orange
// orbit only where Janani still owes an action, a New pod slot, and an
// events tray peeking above the dock. Counts come from the seed.
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDocumentTitle } from '@/components/ui';
import { BlobLogo, HeyMenu, NewPodBlob, PodBlob } from '@/components/heypal';
import type { HubLink } from '@/components/heypal';
import { EVENTS, PODS, podsNeedingMe } from '@/lib/heypal/seed';

// Fixed slots in the pods area (brief part 6). Centers are measured inside
// a 402 wide area that starts about 170 from the top.
const SLOTS = [
  { x: 105, y: 95 },
  { x: 295, y: 75 },
  { x: 120, y: 285 },
  { x: 310, y: 270 },
  { x: 90, y: 455 },
  { x: 255, y: 455 },
];

// Blob size follows the member count (brief part 6).
function podSize(members: number): number {
  if (members <= 3) return 124;
  if (members === 4) return 140;
  if (members === 5) return 156;
  if (members <= 6) return 172;
  return 196;
}

// Every hub destination, reachable from Home. The menu shows the first
// five; the tray and sheets link the rest.
const HUB_LINKS: HubLink[] = [
  { href: '/home', label: 'home', note: 'Your pods' },
  { href: '/hub/profile', label: 'profile', note: 'Interests and limits' },
  { href: '/hub/calendar', label: 'calendar', note: 'Your week' },
  { href: '/money', label: 'money', note: 'What you owe and are owed' },
  { href: '/hub/settings', label: 'settings', note: 'Notifications, plan' },
  { href: '/hub/events', label: 'events', note: 'Things to do in NYC' },
  { href: '/hub/planner', label: 'planner', note: 'Private planner chat' },
  { href: '/hub/payment-methods', label: 'payments', note: 'Linked PayPal' },
];

export default function HomePage() {
  useDocumentTitle('Your pods');
  const router = useRouter();
  const searchDialog = useRef<HTMLDialogElement>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [query, setQuery] = useState('');
  const needing = podsNeedingMe();
  const needingIds = new Set(needing.map((p) => p.id));

  const results = EVENTS.filter((e) =>
    e.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <main data-surface="deep" className="relative flex flex-col min-h-dvh">
      {/* Header zone: search left, hamburger right. */}
      <div
        className="flex items-center justify-between px-4"
        style={{
          height: 'calc(56px + env(safe-area-inset-top, 0px))',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <button
          type="button"
          onClick={() => searchDialog.current?.showModal()}
          aria-label="Search events"
          className="grid place-items-center w-11 h-11 rounded-full"
          style={{ background: 'rgb(255 255 255 / 0.18)' }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            aria-hidden="true"
            fill="none"
            stroke="var(--white)"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="9" cy="9" r="6" strokeDasharray="2.5 2.5" />
            <path d="M13.5 13.5L17 17" />
          </svg>
        </button>
        <HeyMenu surface="deep" items={HUB_LINKS} current="/home" />
      </div>

      {/* Header block. */}
      <div className="px-6 pt-2 pb-1">
        <h1 className="text-[32px] font-bold text-[var(--white)]">Your pods</h1>
        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--mist)]">
          {needing.length > 0 ? (
            <>
              <span
                aria-hidden="true"
                className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--orange)]"
              />
              {needing.length} pods need you
            </>
          ) : (
            "You're all caught up"
          )}
        </p>
      </div>

      {/* Pods area with fixed slots. */}
      <section
        aria-label="Pods"
        className="relative flex-1 mx-auto w-full max-w-[402px]"
        style={{ minHeight: 560 }}
      >
        {PODS.map((pod, i) => {
          const slot = SLOTS[i] ?? { x: 200, y: 200 };
          const size = podSize(pod.memberIds.length);
          const need = podNeedsReason(pod.id);
          return (
            <div
              key={pod.id}
              className="absolute"
              style={{
                left: slot.x,
                top: slot.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <PodBlob
                name={pod.name}
                memberCount={pod.memberIds.length}
                stage={pod.stage}
                needsMeReason={needingIds.has(pod.id) ? need : null}
                size={size}
                onOpen={() => router.push(`/pods/${pod.id}`)}
              />
            </div>
          );
        })}
        <div
          className="absolute"
          style={{
            left: (SLOTS[5] ?? { x: 255 }).x,
            top: (SLOTS[5] ?? { y: 455 }).y,
            transform: 'translate(-50%, -50%)',
            width: 130,
            height: 130,
          }}
        >
          <NewPodBubble onOpen={() => router.push('/pods/create')} />
        </div>
      </section>

      {/* Events tray peek above the dock. */}
      <section
        aria-label="Happening in NYC"
        className="relative bg-[var(--white)] rounded-t-[32px] px-5 pt-3 text-left"
        style={{ zIndex: 'var(--layer-tray)' }}
      >
        <button
          type="button"
          onClick={() => setTrayOpen((v) => !v)}
          aria-expanded={trayOpen}
          aria-label={trayOpen ? 'Collapse events tray' : 'Open events tray'}
          className="mx-auto block w-16 h-8"
        >
          <span
            aria-hidden="true"
            className="hey-dots mx-auto block w-10 h-2 rounded-full text-[var(--blue-mid)]"
          />
        </button>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--ink)]">
            Happening in NYC
          </h2>
          <Link
            href="/hub/events"
            className="text-sm font-semibold text-[var(--ink)] underline underline-offset-4"
          >
            All events
          </Link>
        </div>
        <button
          type="button"
          onClick={() => searchDialog.current?.showModal()}
          className="mt-2 flex items-center gap-2 w-full rounded-full bg-[var(--pale)] px-4 min-h-[44px] text-base text-[var(--ink-muted)]"
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
          >
            <circle cx="9" cy="9" r="6" strokeDasharray="2.5 2.5" />
            <path d="M13.5 13.5L17 17" />
          </svg>
          Search events
        </button>
        {trayOpen ? (
          <ul className="hey-stack mt-3 pb-4">
            {EVENTS.slice(0, 5).map((e, i) => (
              <li key={e.id}>
                <TrayCard index={i} title={e.title} price={e.priceCents} />
              </li>
            ))}
          </ul>
        ) : (
          <div
            aria-hidden="true"
            className="hey-stack mt-3 h-[88px] overflow-hidden"
          >
            {EVENTS.slice(0, 2).map((e, i) => (
              <TrayCard
                key={e.id}
                index={i}
                title={e.title}
                price={e.priceCents}
              />
            ))}
          </div>
        )}
      </section>

      {/* Dock: blob logo left, add button right. Always visible. */}
      <nav
        aria-label="Home actions"
        className="sticky bottom-0 flex items-center justify-between px-5 bg-transparent"
        style={{
          height: 'calc(76px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          zIndex: 'var(--layer-dock)',
        }}
      >
        <BlobLogo surface="deep" size={56} />
        <Link
          href="/pods/create"
          aria-label="Create a new pod"
          className="grid place-items-center w-14 h-14 rounded-full bg-[var(--white)] text-[var(--deep)]"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 26 26"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M13 5v16M5 13h16" strokeDasharray="4 3" />
          </svg>
        </Link>
      </nav>

      {/* Search overlay as a dialog. */}
      <dialog
        ref={searchDialog}
        aria-label="Search events"
        className="hey-menu-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) searchDialog.current?.close();
        }}
      >
        <div className="hey-menu-scrim" aria-hidden="true" />
        <div className="fixed inset-x-0 top-0 mx-auto max-w-[430px] bg-[var(--deep)] px-5 pt-16 pb-8 rounded-b-[32px]">
          <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col gap-3"
          >
            <label
              htmlFor="home-search"
              className="text-sm font-semibold text-[var(--mist)]"
            >
              Search events
            </label>
            <input
              id="home-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tonight, free, food, music"
              className="hey-dot-input"
            />
          </form>
          <ul className="hey-stack mt-4 max-h-[50dvh] overflow-y-auto">
            {results.map((e, i) => (
              <li key={e.id}>
                <TrayCard index={i} title={e.title} price={e.priceCents} />
              </li>
            ))}
          </ul>
          {results.length === 0 && (
            <p className="mt-4 text-base text-[var(--mist)]">
              Nothing matches. Try another word.
            </p>
          )}
          <div className="mt-4 flex items-center justify-between">
            <Link
              href="/hub/events"
              className="text-base font-semibold text-[var(--white)] underline underline-offset-4"
            >
              All events
            </Link>
            <button
              type="button"
              onClick={() => searchDialog.current?.close()}
              className="text-base font-semibold text-[var(--mist)]"
            >
              Close
            </button>
          </div>
        </div>
      </dialog>
    </main>
  );
}

function podNeedsReason(podId: string): string {
  const pod = PODS.find((p) => p.id === podId);
  const plan = podsNeedingMe().find((p) => p.id === podId);
  if (!plan || !pod) return 'Needs your answer';
  if (pod.stage === 'Vote open') return 'Vote open, needs your vote';
  if (pod.stage === 'Ready check') return 'Ready check, needs your answer';
  return 'A payment needs you';
}

function TrayCard({
  index,
  title,
  price,
}: {
  index: number;
  title: string;
  price: number | null;
}) {
  const fills = ['var(--card-deep)', 'var(--card-royal)', 'var(--card-sky)'];
  const texts = ['var(--white)', 'var(--white)', 'var(--ink)'];
  const fill = fills[index % fills.length] ?? 'var(--card-sky)';
  const text = texts[index % texts.length] ?? 'var(--ink)';
  return (
    <div className="hey-stack-card" style={{ background: fill, color: text }}>
      <p className="text-[13px] font-semibold">NYC</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-[22px] font-bold leading-tight">{title}</p>
        <p className="text-[22px] font-bold tabular">
          {price === null ? 'Free' : `$${(price / 100).toFixed(0)}`}
        </p>
      </div>
    </div>
  );
}
