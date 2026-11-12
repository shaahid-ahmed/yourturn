'use client';
// P7, Pod chat in the AI-chat style: soft sky to white gradient, big
// friendly heading, composer card with a gradient frame. Same message
// kinds and rules, restyled. Layout: compose, logo in the header.
import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  PlannerCard,
  Card,
  Button,
  BalanceChip,
  useDocumentTitle,
} from '@/components/ui';
import { BlobLogo, HeyMenu } from '@/components/heypal';
import { PODS, personName } from '@/lib/heypal/seed';

type MessageKind =
  | 'text'
  | 'activity_shortlist'
  | 'time_poll'
  | 'ready_check'
  | 'booking_confirm'
  | 'payer_split';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  kind: MessageKind;
  text?: string;
  ts: string;
  activities?: ActivityOption[];
  timeSlots?: TimeSlot[];
  readyPlan?: string;
  readyMembers?: Record<string, boolean | null>;
  bookingDetails?: BookingDetails;
  payerSplit?: PayerSplit;
}

interface ActivityOption {
  id: string;
  title: string;
  venue: string;
  date: string;
  estCostPerPerson: number;
  tags: string[];
  votes: string[];
}

interface TimeSlot {
  id: string;
  label: string;
  votes: string[];
}

interface BookingDetails {
  venue: string;
  when: string;
  headCount: number;
  estTotal: number;
  status: 'waiting_confirm' | 'booking' | 'booked' | 'could_not_book';
}

interface PayerSplit {
  payer: string;
  totalCents: number;
  shares: Record<string, number>;
}

// Synthetic demo state for the Friday Crew stream.
const ME = { id: 'p-me', name: 'Janani' };
const MEMBERS = [
  ME,
  { id: 'p-maya', name: 'Maya' },
  { id: 'p-dev', name: 'Dev' },
  { id: 'p-priya', name: 'Priya' },
  { id: 'p-sam', name: 'Sam' },
];

// Votes are shown with first names, never raw ids.
function voterNames(ids: string[], iVoted: boolean): string[] {
  const names = ids
    .filter((id) => id !== ME.id)
    .map((id) => MEMBERS.find((m) => m.id === id)?.name ?? id);
  return iVoted ? [...names, ME.name] : names;
}

function voteLine(ids: string[], iVoted: boolean): string {
  const names = voterNames(ids, iVoted);
  if (names.length === 0) return 'No votes yet';
  return `${names.length} vote${names.length !== 1 ? 's' : ''} · ${names.join(', ')}`;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'm0',
    senderId: 'p-sam',
    senderName: 'Sam',
    kind: 'text',
    text: 'Anyone free Friday? The planner has some ideas.',
    ts: '5:31 PM',
  },
  {
    id: 'm1',
    senderId: 'planner',
    senderName: 'Planner',
    kind: 'activity_shortlist',
    ts: '5:32 PM',
    activities: [
      {
        id: 'a1',
        title: 'Open Bowl Night',
        venue: 'Brooklyn Bowl',
        date: 'Fri Nov 20, 7 to 10 PM',
        estCostPerPerson: 35,
        tags: ['Active', 'Food'],
        votes: ['p-sam'],
      },
      {
        id: 'a2',
        title: 'Friday Escape Challenge',
        venue: 'Clue Chase Escape Rooms',
        date: 'Fri Nov 20, 8 to 9:30 PM',
        estCostPerPerson: 30,
        tags: ['Active', 'Indoor'],
        votes: [],
      },
      {
        id: 'a3',
        title: 'Friday Evening Swing Suite',
        venue: 'Topgolf Swing Suite',
        date: 'Fri Nov 20, 6 to 9 PM',
        estCostPerPerson: 45,
        tags: ['Active', 'Food'],
        votes: ['p-priya'],
      },
    ],
  },
  {
    id: 'm2',
    senderId: 'p-priya',
    senderName: 'Priya',
    kind: 'text',
    text: 'Escape room sounds fun! Voted.',
    ts: '5:35 PM',
  },
];

const MENU_ITEMS = [
  { href: '/home', label: 'home', note: 'Your pods' },
  { href: '/hub/profile', label: 'profile', note: 'Interests and limits' },
  { href: '/hub/calendar', label: 'calendar', note: 'Your week' },
  { href: '/money', label: 'money', note: 'What you owe and are owed' },
  { href: '/hub/settings', label: 'settings', note: 'Notifications, plan' },
];

export default function PodChatPage() {
  const params = useParams<{ podId: string }>();
  const router = useRouter();
  const podId = typeof params.podId === 'string' ? params.podId : 'pod-friday';
  const pod = PODS.find((p) => p.id === podId) ?? PODS[0];
  const podName = pod?.name ?? 'Friday Crew';
  const memberCount = pod?.memberIds.length ?? 5;
  useDocumentTitle(`${podName} chat`);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [showPlus, setShowPlus] = useState(false);
  const [myActivityVotes, setMyActivityVotes] = useState<
    Record<string, boolean>
  >({});
  const [myTimeVotes, setMyTimeVotes] = useState<Record<string, boolean>>({});
  const [myReadyState, setMyReadyState] = useState<boolean | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [composerPad, setComposerPad] = useState(140);

  useEffect(() => {
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    bottomRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }, [messages]);

  useEffect(() => {
    const el = composerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      setComposerPad(el.offsetHeight + 16);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function sendMessage() {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `m${Date.now()}`,
        senderId: 'me',
        senderName: 'You',
        kind: 'text',
        text: input,
        ts: 'Now',
      },
    ]);
    setInput('');
  }

  function askPlanner(idea: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: `m${Date.now()}`,
        senderId: 'planner',
        senderName: 'Planner',
        kind: 'text',
        text: idea,
        ts: 'Now',
      },
    ]);
    setShowPlus(false);
  }

  // One vote per member; tapping another option moves it, tapping the
  // same option again withdraws it (change a vote before close).
  function voteActivity(activityId: string, vote: boolean) {
    setMyActivityVotes(vote ? { [activityId]: true } : {});
  }

  function voteTime(slotId: string) {
    setMyTimeVotes((prev) => ({ ...prev, [slotId]: !prev[slotId] }));
  }

  function handleReadyCheck(answer: boolean) {
    setMyReadyState(answer);
    if (answer) {
      // After ready check, show booking confirmation card
      setMessages((prev) => [
        ...prev,
        {
          id: `m${Date.now()}`,
          senderId: 'planner',
          senderName: 'Planner',
          kind: 'booking_confirm',
          ts: 'Now',
          bookingDetails: {
            venue: 'Brooklyn Bowl',
            when: 'Fri Nov 20, 7 to 10 PM',
            headCount: 3,
            estTotal: 105,
            status: 'waiting_confirm',
          },
        },
      ]);
    }
  }

  function confirmBooking() {
    setBookingConfirmed(true);
    setMessages((prev) =>
      prev.map((m) =>
        m.kind === 'booking_confirm' && m.bookingDetails
          ? { ...m, bookingDetails: { ...m.bookingDetails, status: 'booked' } }
          : m,
      ),
    );
  }

  // Demo: inject time poll
  function addTimePoll() {
    setMessages((prev) => [
      ...prev,
      {
        id: `m${Date.now()}`,
        senderId: 'planner',
        senderName: 'Planner',
        kind: 'time_poll',
        ts: 'Now',
        timeSlots: [
          { id: 't1', label: 'Fri Nov 20, 7 PM', votes: ['p-sam'] },
          { id: 't2', label: 'Sat Nov 21, 3 PM', votes: ['p-priya', 'p-dev'] },
          { id: 't3', label: 'Sun Nov 22, 5 PM', votes: [] },
        ],
      },
    ]);
  }

  function addReadyCheck() {
    setMessages((prev) => [
      ...prev,
      {
        id: `m${Date.now()}`,
        senderId: 'planner',
        senderName: 'Planner',
        kind: 'ready_check',
        ts: 'Now',
        readyPlan: 'Brooklyn Bowl, Fri Nov 20, 7 PM',
        readyMembers: {
          'p-sam': true,
          'p-dev': true,
          'p-priya': true,
          'p-maya': null,
          'p-me': null,
        },
      },
    ]);
  }

  return (
    <main data-surface="white" className="hey-chat-bg flex flex-col h-dvh">
      {/* Header (56px): logo left, pod identity, hamburger right. */}
      <header className="flex items-center gap-2 px-2 h-14 shrink-0">
        <BlobLogo surface="white" size={36} label="HeyPal, go to home" />
        <button
          type="button"
          onClick={() => router.push(`/pods/${podId}/settings`)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left bg-transparent border-none"
          aria-label={`${podName}, pod details`}
        >
          <span
            aria-hidden="true"
            className="w-8 h-8 shrink-0 rounded-full"
            style={{ background: 'rgb(0 41 145 / 0.14)' }}
          />
          <span className="min-w-0">
            <span className="block text-[20px] font-bold text-[var(--ink)] truncate leading-tight">
              {podName}
            </span>
            <span className="block text-[14px] font-medium text-[var(--ink-muted)]">
              {memberCount} members
            </span>
          </span>
        </button>
        <HeyMenu surface="white" items={MENU_ITEMS} current="" />
      </header>

      {/* Next hangout bar */}
      <div className="px-4 py-2 text-[13px] font-semibold text-[var(--ink-muted)]">
        Next hangout: <strong className="text-[var(--ink)]">Fri Nov 20</strong>{' '}
        · Brooklyn Bowl (pending)
      </div>

      {/* Message stream, padded for the composer height. */}
      <div
        className="flex-1 overflow-y-auto px-3 flex flex-col gap-3"
        style={{ paddingBottom: composerPad }}
        role="log"
        aria-label="Pod chat messages"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="pt-10">
            <p className="text-base font-medium text-[var(--ink-muted)]">
              Hi Janani
            </p>
            <h1 className="text-[34px] font-bold text-[var(--ink)] leading-tight">
              What should the pod do this weekend?
            </h1>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() =>
                  askPlanner(
                    'Here are three ideas near you: rooftop movie night, pottery drop in, and comedy night.',
                  )
                }
                className="hey-card bg-[var(--pale)] text-[var(--ink)] text-base font-semibold text-left px-4 py-3 border-none cursor-pointer"
              >
                Ask HeyPal for ideas
              </button>
              <button
                type="button"
                onClick={addTimePoll}
                className="hey-card bg-[var(--sky)] text-[var(--ink)] text-base font-semibold text-left px-4 py-3 border-none cursor-pointer"
              >
                Start a poll
              </button>
              <button
                type="button"
                onClick={() => router.push('/hub/events')}
                className="hey-card bg-[var(--white)] text-[var(--ink)] text-base font-semibold text-left px-4 py-3 border border-[var(--sky)] cursor-pointer"
              >
                Suggest an event
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              msg={msg}
              myActivityVotes={myActivityVotes}
              myTimeVotes={myTimeVotes}
              myReadyState={myReadyState}
              bookingConfirmed={bookingConfirmed}
              onVoteActivity={voteActivity}
              onVoteTime={voteTime}
              onReadyCheck={handleReadyCheck}
              onConfirmBooking={confirmBooking}
            />
          ))
        )}
        <div ref={bottomRef} />

        {/* Demo controls */}
        <div className="flex flex-col gap-2 mt-4 px-2">
          <p className="text-xs text-center text-[var(--ink-muted)]">
            Demo actions
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            <Button variant="ghost" onClick={addTimePoll}>
              Add time poll
            </Button>
            <Button variant="ghost" onClick={addReadyCheck}>
              Add ready check
            </Button>
          </div>
        </div>
      </div>

      {/* Composer card with gradient frame. */}
      <div
        ref={composerRef}
        className="fixed bottom-0 inset-x-0 mx-auto max-w-[430px] px-4"
        style={{
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
          zIndex: 'var(--layer-dock)',
        }}
      >
        <div className="hey-composer-frame">
          <div className="hey-composer-inner">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-[var(--ink)]">
                {memberCount} in this pod
              </p>
              <button
                type="button"
                onClick={() =>
                  askPlanner('Got it. I will pull three ideas for the group.')
                }
                className="text-sm font-bold text-[var(--ink)] bg-transparent border-none cursor-pointer"
              >
                Ask HeyPal
              </button>
            </div>
            <div className="rounded-3xl bg-[var(--white)] border border-[var(--sky)] px-4 pt-2 pb-2">
              <label htmlFor="chat-input" className="sr-only">
                Message the pod
              </label>
              <textarea
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={`Message ${podName}`}
                rows={1}
                className="w-full text-base text-[var(--ink)] bg-transparent border-none resize-none focus:outline-none min-h-[44px]"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowPlus((v) => !v)}
                  aria-expanded={showPlus}
                  aria-label="More actions"
                  className="grid place-items-center w-9 h-9 rounded-full border-2 border-dotted border-[var(--blue-mid)] text-[var(--ink)] bg-transparent cursor-pointer"
                >
                  <span aria-hidden="true" className="text-xl leading-none">
                    +
                  </span>
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="grid place-items-center w-11 h-11 rounded-full bg-[var(--deep)] text-[var(--white)] disabled:bg-[var(--sky)]"
                  aria-label={
                    input.trim() ? 'Send message' : 'Ask the planner for ideas'
                  }
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {input.trim() ? (
                      <path d="M4 16L16 10 4 4v5l8 1-8 1v5z" />
                    ) : (
                      <path d="M10 2l1.6 4.4L16 8l-4.4 1.6L10 14l-1.6-4.4L4 8l4.4-1.6L10 2z" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
            {showPlus && (
              <div className="flex gap-2 mt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    askPlanner('Here are three ideas for Friday night.')
                  }
                  className="rounded-full bg-[var(--pale)] px-4 min-h-[44px] text-sm font-semibold text-[var(--ink)] border-none cursor-pointer"
                >
                  Ask HeyPal for ideas
                </button>
                <button
                  type="button"
                  onClick={addTimePoll}
                  className="rounded-full bg-[var(--pale)] px-4 min-h-[44px] text-sm font-semibold text-[var(--ink)] border-none cursor-pointer"
                >
                  Start a poll
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/hub/events')}
                  className="rounded-full bg-[var(--pale)] px-4 min-h-[44px] text-sm font-semibold text-[var(--ink)] border-none cursor-pointer"
                >
                  Suggest an event
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function ChatMessage({
  msg,
  myActivityVotes,
  myTimeVotes,
  myReadyState,
  bookingConfirmed,
  onVoteActivity,
  onVoteTime,
  onReadyCheck,
  onConfirmBooking,
}: {
  msg: Message;
  myActivityVotes: Record<string, boolean>;
  myTimeVotes: Record<string, boolean>;
  myReadyState: boolean | null;
  bookingConfirmed: boolean;
  onVoteActivity: (id: string, vote: boolean) => void;
  onVoteTime: (id: string) => void;
  onReadyCheck: (answer: boolean) => void;
  onConfirmBooking: () => void;
}) {
  const isMe = msg.senderId === ME.id;
  const isPlanner = msg.senderId === 'planner';

  if (isPlanner && msg.kind === 'activity_shortlist' && msg.activities) {
    return (
      <PlannerCard>
        <p className="text-sm font-medium text-[var(--ink)] mb-3">
          Here are three options for Friday. Votes are visible to everyone.
        </p>
        <div className="flex flex-col gap-3">
          {msg.activities.map((a) => (
            <ActivityCard
              key={a.id}
              activity={a}
              myVote={myActivityVotes[a.id]}
              onVote={(v) => onVoteActivity(a.id, v)}
            />
          ))}
        </div>
      </PlannerCard>
    );
  }

  if (isPlanner && msg.kind === 'time_poll' && msg.timeSlots) {
    return (
      <PlannerCard>
        <p className="text-sm font-medium text-[var(--ink)] mb-3">
          When works best? Votes close in 24 hours.
        </p>
        <div className="flex flex-col gap-2">
          {msg.timeSlots.map((slot) => (
            <button
              key={slot.id}
              onClick={() => onVoteTime(slot.id)}
              aria-pressed={myTimeVotes[slot.id] ?? false}
              className={`flex items-center justify-between px-4 py-3 rounded-3xl border-2 min-h-[44px] text-sm transition-colors ${
                myTimeVotes[slot.id]
                  ? 'bg-[var(--deep)] text-[var(--white)] border-[var(--deep)]'
                  : 'bg-[var(--white)] border-[var(--sky)] text-[var(--ink)]'
              }`}
            >
              <span>{slot.label}</span>
              <span className="text-xs">
                {voteLine(slot.votes, myTimeVotes[slot.id] ?? false)}
              </span>
            </button>
          ))}
        </div>
      </PlannerCard>
    );
  }

  if (isPlanner && msg.kind === 'ready_check' && msg.readyPlan) {
    const checkedIn = myReadyState !== null;
    return (
      <PlannerCard>
        <p className="text-sm font-medium text-[var(--ink)] mb-1">
          Are you in?
        </p>
        <p className="text-sm text-[var(--ink-muted)] mb-3">{msg.readyPlan}</p>
        <p className="text-xs text-[var(--ink-muted)] mb-3">
          Anyone who says yes shares the cost. No pressure.
        </p>
        {msg.readyMembers && (
          <ul className="mb-3 flex flex-col text-sm">
            {MEMBERS.map((m) => {
              const answer =
                m.id === ME.id ? myReadyState : msg.readyMembers?.[m.id];
              return (
                <li key={m.id} className="flex justify-between py-2">
                  <span>{m.name}</span>
                  <span className="font-medium">
                    {answer === true
                      ? 'In'
                      : answer === false
                        ? 'Out'
                        : 'Not answered'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {!checkedIn ? (
          <div className="flex gap-3">
            <Button fullWidth onClick={() => onReadyCheck(true)}>
              Yes, I am in
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onClick={() => onReadyCheck(false)}
            >
              Not this time
            </Button>
          </div>
        ) : (
          <p className="text-sm text-[var(--ink-muted)]">
            You said: <strong>{myReadyState ? 'Yes' : 'No'}</strong>
          </p>
        )}
      </PlannerCard>
    );
  }

  if (isPlanner && msg.kind === 'booking_confirm' && msg.bookingDetails) {
    const bd = msg.bookingDetails;
    return (
      <PlannerCard>
        <p className="text-sm font-medium text-[var(--ink)] mb-3">
          Shall I book this?
        </p>
        <div className="rounded-3xl bg-[var(--white)] border border-[var(--sky)] p-3 mb-3 flex flex-col gap-1 text-sm">
          <p>
            <strong>{bd.venue}</strong>
          </p>
          <p className="text-[var(--ink-muted)]">
            {bd.when} · {bd.headCount} people
          </p>
          <p>
            Est. total: <strong>${bd.estTotal}</strong>
          </p>
        </div>
        {bd.status === 'waiting_confirm' && !bookingConfirmed && (
          <>
            <p className="text-xs text-[var(--ink-muted)] mb-3">
              This is not a payment and not a reservation. I will not book
              anything until you confirm.
            </p>
            <Button fullWidth onClick={onConfirmBooking}>
              Confirm, book it
            </Button>
          </>
        )}
        {(bd.status === 'booked' || bookingConfirmed) && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-[var(--color-status-paid)] font-medium">
              Booked. Calendars of those who said yes are blocked.
            </p>
            <span className="notice rounded-[var(--radius-chip)] px-2 py-1 text-sm font-medium">
              Simulated booking, nothing was reserved with the venue
            </span>
          </div>
        )}
        {bd.status === 'could_not_book' && (
          <p className="text-sm text-[var(--color-danger)]">
            Could not book. I will offer the next-best plan.
          </p>
        )}
      </PlannerCard>
    );
  }

  if (isPlanner && msg.kind === 'payer_split' && msg.payerSplit) {
    const split = msg.payerSplit;
    return (
      <PlannerCard>
        <p className="text-sm font-medium text-[var(--ink)] mb-2">
          {personName(split.payer)} paid ${(split.totalCents / 100).toFixed(2)}.
          Settle up in Money.
        </p>
        <ul className="text-sm">
          {Object.entries(split.shares).map(([id, cents]) => (
            <li key={id} className="flex justify-between py-1">
              <span>{personName(id)}</span>
              <span className="font-semibold tabular">
                ${(cents / 100).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </PlannerCard>
    );
  }

  // Plain text or planner note
  return (
    <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMe && (
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-1 ${
            isPlanner
              ? 'bg-[var(--orange)] text-[var(--ink)]'
              : 'bg-[var(--pale)] text-[var(--ink-muted)]'
          }`}
          aria-hidden="true"
        >
          {isPlanner ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 1l1.8 4.6L14 7l-4.2 1.4L8 13l-1.8-4.6L2 7l4.2-1.4L8 1z" />
            </svg>
          ) : (
            msg.senderName[0]
          )}
        </div>
      )}
      <div
        className={`max-w-[78%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}
      >
        {!isMe && !isPlanner && (
          <p className="text-[13px] font-semibold text-[var(--ink-muted)] px-1">
            {msg.senderName}
          </p>
        )}
        <div
          className={`rounded-[22px] px-4 py-2.5 text-base ${
            isMe
              ? 'bg-[var(--royal)] text-[var(--white)] rounded-tr-md'
              : isPlanner
                ? 'bg-[var(--pale)] text-[var(--ink)] rounded-tl-md'
                : 'bg-[var(--white)] text-[var(--ink)] border border-[var(--sky)] rounded-tl-md'
          }`}
        >
          {msg.text}
        </div>
        <p className="text-[13px] text-[var(--ink-muted)] px-1">{msg.ts}</p>
      </div>
    </div>
  );
}

function ActivityCard({
  activity,
  myVote,
  onVote,
}: {
  activity: ActivityOption;
  myVote?: boolean;
  onVote: (vote: boolean) => void;
}) {
  const voted = myVote === true;
  return (
    <Card className="flex flex-col gap-2">
      <div
        aria-hidden="true"
        className="hey-dots h-8 rounded-2xl text-[var(--blue-mid)]"
      />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">
            {activity.title}
          </p>
          <p className="text-xs text-[var(--ink-muted)]">{activity.venue}</p>
          <p className="text-xs text-[var(--ink-muted)]">{activity.date}</p>
        </div>
        <p className="text-sm font-semibold text-[var(--ink)] shrink-0 tabular">
          ~${activity.estCostPerPerson}/person
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {activity.tags.map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 bg-[var(--pale)] rounded-full text-xs text-[var(--ink-muted)]"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 mt-1">
        <p className="text-xs text-[var(--ink-muted)]">
          {voteLine(activity.votes, voted)}
        </p>
        <Button
          variant={voted ? 'secondary' : 'primary'}
          aria-pressed={voted}
          aria-label={`${voted ? 'Voted' : 'Vote'} for ${activity.title}`}
          onClick={() => onVote(!voted)}
        >
          {voted ? 'Voted' : 'Vote'}
        </Button>
      </div>
      {voted && <BalanceChip status="paid" />}
    </Card>
  );
}
