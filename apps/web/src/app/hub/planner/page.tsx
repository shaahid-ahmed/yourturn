'use client';
// P22 — Private planner chat
// One-to-one chat with the planner, including budget stretch asks.
// Group NEVER sees this. Reminders private to member.
import { useState, useRef, useEffect } from 'react';
import {
  Button,
  ScreenHeader,
  BackButton,
  LockBadge,
  Card,
} from '@/components/ui';

interface PlannerMessage {
  id: string;
  from: 'me' | 'planner';
  text?: string;
  kind?: 'stretch_ask';
  hangout?: string;
  currentBudgetDollars?: number;
  askAmountDollars?: number;
}

const INITIAL_MESSAGES: PlannerMessage[] = [
  {
    id: 'p0',
    from: 'planner',
    text: 'Hi! This is your private space. I can share context here that never goes to the group — like when a plan is a bit over your budget.',
  },
  {
    id: 'p1',
    from: 'planner',
    kind: 'stretch_ask',
    hangout: 'Brooklyn Bowl · Fri Nov 20',
    currentBudgetDollars: 30,
    askAmountDollars: 35,
    text: 'The best option for Friday crew is a little over your usual budget. Would a one-time exception work for this hangout?',
  },
];

export default function PrivatePlannerPage() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [stretchAnswer, setStretchAnswer] = useState<'yes' | 'no' | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage() {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: `m${Date.now()}`, from: 'me', text: input },
    ]);
    setInput('');
    // Demo echo
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `r${Date.now()}`,
          from: 'planner',
          text: "Got it — I'll keep that in mind for next time.",
        },
      ]);
    }, 800);
  }

  function answerStretch(answer: 'yes' | 'no') {
    setStretchAnswer(answer);
    setMessages((prev) => [
      ...prev,
      {
        id: `s${Date.now()}`,
        from: 'planner',
        text:
          answer === 'yes'
            ? "Thanks! I'll include that option in the shortlist. The group won't know you stretched."
            : "Understood. I'll keep looking for options within your usual budget.",
      },
    ]);
  }

  return (
    <main className="flex flex-col h-dvh">
      <ScreenHeader
        title="Private planner chat"
        back={<BackButton href="/home" />}
      />

      <div className="px-4 py-2 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border)] flex items-center gap-2">
        <LockBadge />
        <span className="text-xs text-[var(--color-ink-muted)]">
          Never visible to the pod.
        </span>
      </div>

      <div
        className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-3"
        role="log"
        aria-label="Private planner chat"
        aria-live="polite"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.from === 'me' ? 'flex-row-reverse' : 'flex-row'} gap-2`}
          >
            {msg.from === 'planner' && (
              <div
                className="w-8 h-8 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1"
                aria-hidden="true"
              >
                AI
              </div>
            )}
            <div
              className={`max-w-[80%] flex flex-col gap-1 ${msg.from === 'me' ? 'items-end' : 'items-start'}`}
            >
              {msg.kind === 'stretch_ask' ? (
                <Card className="border-[var(--color-accent)]">
                  <p className="text-sm text-[var(--color-ink)] mb-2">
                    {msg.text}
                  </p>
                  <p className="text-xs text-[var(--color-ink-muted)] mb-3">
                    Your usual budget:{' '}
                    <strong>${msg.currentBudgetDollars}</strong> · This option:{' '}
                    <strong>${msg.askAmountDollars}</strong>
                  </p>
                  {stretchAnswer === null ? (
                    <div className="flex gap-2">
                      <Button fullWidth onClick={() => answerStretch('yes')}>
                        Yes, just this once
                      </Button>
                      <Button
                        fullWidth
                        variant="secondary"
                        onClick={() => answerStretch('no')}
                      >
                        No thanks
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-ink-muted)]">
                      You said:{' '}
                      <strong>
                        {stretchAnswer === 'yes'
                          ? 'Yes, just this once'
                          : 'No thanks'}
                      </strong>
                    </p>
                  )}
                  <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                    The group never sees this ask or your answer.
                  </p>
                </Card>
              ) : (
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm ${msg.from === 'me' ? 'bg-[var(--color-accent)] text-white rounded-tr-sm' : 'bg-[var(--color-surface-sunken)] text-[var(--color-ink)] rounded-tl-sm'}`}
                >
                  {msg.text}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

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
            placeholder="Message your planner…"
            className="flex-1 min-h-[44px] rounded-xl border border-[var(--color-border)] px-4 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
            aria-label="Message planner"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-11 h-11 rounded-xl bg-[var(--color-accent)] text-white flex items-center justify-center disabled:opacity-50 hover:bg-[#174F76] transition-colors"
            aria-label="Send"
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
