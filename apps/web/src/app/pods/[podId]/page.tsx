'use client';
// P7 — Pod chat + planner cards (P9–P12 appear as cards in this stream)
import { useState, useRef, useEffect } from 'react';
import {
  PlannerCard,
  Card,
  Button,
  BalanceChip,
  useDocumentTitle,
} from '@/components/ui';

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
  // P9 activity shortlist
  activities?: ActivityOption[];
  // P10 time poll
  timeSlots?: TimeSlot[];
  // P11 ready check
  readyPlan?: string;
  readyMembers?: Record<string, boolean | null>;
  // P12 booking confirm
  bookingDetails?: BookingDetails;
  // P13 payer and split
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

// Synthetic demo state
const ME = { id: 'me', name: 'You' };
const MEMBERS = [
  ME,
  { id: 'sam', name: 'Sam' },
  { id: 'priya', name: 'Priya' },
  { id: 'alex', name: 'Alex' },
];

// Votes are shown with first names (spec P9/P10, Q-013), never raw ids.
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
    senderId: 'sam',
    senderName: 'Sam',
    kind: 'text',
    text: 'Anyone free Friday? The planner has some ideas 👀',
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
        date: 'Fri Nov 20, 7–10 PM',
        estCostPerPerson: 35,
        tags: ['Active', 'Food'],
        votes: ['sam'],
      },
      {
        id: 'a2',
        title: 'Friday Escape Challenge',
        venue: 'Clue Chase Escape Rooms',
        date: 'Fri Nov 20, 8–9:30 PM',
        estCostPerPerson: 30,
        tags: ['Active', 'Indoor'],
        votes: [],
      },
      {
        id: 'a3',
        title: 'Friday Evening Swing Suite',
        venue: 'Topgolf Swing Suite',
        date: 'Fri Nov 20, 6–9 PM',
        estCostPerPerson: 45,
        tags: ['Active', 'Food'],
        votes: ['priya'],
      },
    ],
  },
  {
    id: 'm2',
    senderId: 'priya',
    senderName: 'Priya',
    kind: 'text',
    text: 'Escape room sounds fun! Voted 🙋',
    ts: '5:35 PM',
  },
];

export default function PodChatPage() {
  useDocumentTitle('Friday crew chat');
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [myActivityVotes, setMyActivityVotes] = useState<
    Record<string, boolean>
  >({});
  const [myTimeVotes, setMyTimeVotes] = useState<Record<string, boolean>>({});
  const [myReadyState, setMyReadyState] = useState<boolean | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    bottomRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }, [messages]);

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

  // One vote per member; tapping another option moves it, tapping the
  // same option again withdraws it (spec P9: change a vote before close).
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
            when: 'Fri Nov 20, 7–10 PM',
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
          { id: 't1', label: 'Fri Nov 20, 7 PM', votes: ['sam'] },
          { id: 't2', label: 'Sat Nov 21, 3 PM', votes: ['priya', 'alex'] },
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
        readyMembers: { sam: true, priya: true, alex: null, me: null },
      },
    ]);
  }

  return (
    <main className="flex flex-col h-dvh">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-14 border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-10">
        <a
          href="/home"
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[var(--color-surface-sunken)]"
          aria-label="Back to home"
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
            <path d="M12 16l-6-6 6-6" />
          </svg>
        </a>
        <a href="/pods/pod-1/settings" className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-[var(--color-ink)] truncate">
            Friday crew
          </h1>
          <p className="text-xs text-[var(--color-ink-muted)]">
            {MEMBERS.map((m) => m.name).join(', ')}
          </p>
        </a>
      </header>

      {/* Next hangout bar */}
      <div className="px-4 py-2 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border)] text-xs text-[var(--color-ink-muted)]">
        Next hangout:{' '}
        <strong className="text-[var(--color-ink)]">Fri Nov 20</strong> ·
        Brooklyn Bowl (pending)
      </div>

      {/* Message stream */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-3"
        role="log"
        aria-label="Pod chat messages"
        aria-live="polite"
      >
        {messages.map((msg) => (
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
        ))}
        <div ref={bottomRef} />

        {/* Demo controls */}
        <div className="flex flex-col gap-2 mt-4 px-2">
          <p className="text-xs text-center text-[var(--color-ink-muted)]">
            — Demo actions —
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

      {/* Composer */}
      <div className="px-3 pb-4 pt-2 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Message Friday crew…"
            className="flex-1 min-h-[44px] rounded-xl border border-[var(--color-border)] px-4 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
            aria-label="Message input"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-11 h-11 rounded-xl bg-[var(--color-accent)] text-white flex items-center justify-center disabled:opacity-50 active:bg-[var(--color-action-pressed)] transition-colors"
            aria-label="Send message"
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
              <path d="M4 16L16 10 4 4v5l8 1-8 1v5z" />
            </svg>
          </button>
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
  const isMe = msg.senderId === 'me';
  const isPlanner = msg.senderId === 'planner';

  if (isPlanner && msg.kind === 'activity_shortlist' && msg.activities) {
    return (
      <PlannerCard>
        <p className="text-sm font-medium text-[var(--color-ink)] mb-3">
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
        <p className="text-sm font-medium text-[var(--color-ink)] mb-3">
          When works best? Votes close in 24 hours.
        </p>
        <div className="flex flex-col gap-2">
          {msg.timeSlots.map((slot) => (
            <button
              key={slot.id}
              onClick={() => onVoteTime(slot.id)}
              aria-pressed={myTimeVotes[slot.id] ?? false}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border min-h-[44px] text-sm transition-colors ${
                myTimeVotes[slot.id]
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)]'
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
        <p className="text-sm font-medium text-[var(--color-ink)] mb-1">
          Are you in?
        </p>
        <p className="text-sm text-[var(--color-ink-muted)] mb-3">
          {msg.readyPlan}
        </p>
        <p className="text-xs text-[var(--color-ink-muted)] mb-3">
          Anyone who says yes shares the cost. No pressure.
        </p>
        {msg.readyMembers && (
          <ul className="mb-3 flex flex-col divide-y divide-[var(--color-hairline)] text-sm">
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
              Yes, I&apos;m in
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
          <p className="text-sm text-[var(--color-ink-muted)]">
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
        <p className="text-sm font-medium text-[var(--color-ink)] mb-3">
          Shall I book this?
        </p>
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-3 mb-3 flex flex-col gap-1 text-sm">
          <p>
            <strong>{bd.venue}</strong>
          </p>
          <p className="text-[var(--color-ink-muted)]">
            {bd.when} · {bd.headCount} people
          </p>
          <p>
            Est. total: <strong>${bd.estTotal}</strong>
          </p>
        </div>
        {bd.status === 'waiting_confirm' && !bookingConfirmed && (
          <>
            <p className="text-xs text-[var(--color-ink-muted)] mb-3">
              This is not a payment and not a reservation. I won't book anything
              until you confirm.
            </p>
            <Button fullWidth onClick={onConfirmBooking}>
              Confirm — book it
            </Button>
          </>
        )}
        {(bd.status === 'booked' || bookingConfirmed) && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-[var(--color-status-paid)] font-medium">
              Booked ✓ — calendars of those who said yes are blocked
            </p>
            <span className="notice rounded-[var(--radius-chip)] px-2 py-1 text-sm font-medium">
              Simulated booking — nothing was reserved with the venue
            </span>
          </div>
        )}
        {bd.status === 'could_not_book' && (
          <p className="text-sm text-[var(--color-danger)]">
            Could not book — I'll offer the next-best plan.
          </p>
        )}
      </PlannerCard>
    );
  }

  // Plain text
  return (
    <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMe && (
        <div
          className="w-7 h-7 rounded-full bg-[var(--color-surface-sunken)] border border-[var(--color-border)] flex items-center justify-center text-xs font-semibold text-[var(--color-ink-muted)] shrink-0 mt-1"
          aria-hidden="true"
        >
          {msg.senderName[0]}
        </div>
      )}
      <div
        className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}
      >
        {!isMe && (
          <p className="text-xs text-[var(--color-ink-muted)] px-1">
            {msg.senderName}
          </p>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isMe
              ? 'bg-[var(--color-surface-sunken)] text-[var(--color-ink)] rounded-tr-sm'
              : 'bg-[var(--color-surface-sunken)] text-[var(--color-ink)] rounded-tl-sm'
          }`}
        >
          {msg.text}
        </div>
        <p className="text-xs text-[var(--color-ink-muted)] px-1">{msg.ts}</p>
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
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {activity.title}
          </p>
          <p className="text-xs text-[var(--color-ink-muted)]">
            {activity.venue}
          </p>
          <p className="text-xs text-[var(--color-ink-muted)]">
            {activity.date}
          </p>
        </div>
        <p className="text-sm font-semibold text-[var(--color-ink)] shrink-0">
          ~${activity.estCostPerPerson}/person
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {activity.tags.map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border)] rounded-full text-xs text-[var(--color-ink-muted)]"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 mt-1">
        <p className="text-xs text-[var(--color-ink-muted)]">
          {voteLine(activity.votes, voted)}
        </p>
        <Button
          variant={voted ? 'secondary' : 'primary'}
          aria-pressed={voted}
          aria-label={`${voted ? 'Voted' : 'Vote'} for ${activity.title}`}
          onClick={() => onVote(!voted)}
        >
          {voted ? 'Voted ✓' : 'Vote'}
        </Button>
      </div>
    </Card>
  );
}
