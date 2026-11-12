'use client';
// P22, Private planner chat on the deep surface. Same composer card as the
// pod chat, recolored. The budget ask uses seed values: Friday's plan is
// about $45 each against a $40 budget.
import { useState, useRef, useEffect } from 'react';
import {
  Button,
  BackButton,
  LockBadge,
  Card,
  useDocumentTitle,
} from '@/components/ui';
import { BlobLogo, HeyMenu } from '@/components/heypal';
import {
  FRIDAY_OUT_ESTIMATE_CENTS,
  MY_BUDGET_CENTS,
  formatMoney,
} from '@/lib/heypal/seed';

interface PlannerMessage {
  id: string;
  from: 'me' | 'planner';
  text?: string;
  kind?: 'stretch_ask';
}

const BUDGET_ASK = `Friday's plan is about ${formatMoney(FRIDAY_OUT_ESTIMATE_CENTS).replace('.00', '')} each, above your ${formatMoney(MY_BUDGET_CENTS).replace('.00', '')} budget. Is that okay this once?`;

const INITIAL_MESSAGES: PlannerMessage[] = [
  {
    id: 'p0',
    from: 'planner',
    text: 'Hi Janani! This is your private space. I can share context here that never goes to the group, like when a plan is a bit over your budget.',
  },
  { id: 'p1', from: 'planner', kind: 'stretch_ask', text: BUDGET_ASK },
];

const MENU_ITEMS = [
  { href: '/home', label: 'home', note: 'Your pods' },
  { href: '/hub/profile', label: 'profile', note: 'Interests and limits' },
  { href: '/hub/calendar', label: 'calendar', note: 'Your week' },
  { href: '/money', label: 'money', note: 'What you owe and are owed' },
  { href: '/hub/settings', label: 'settings', note: 'Notifications, plan' },
];

export default function PrivatePlannerPage() {
  useDocumentTitle('Private planner chat');
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [stretchAnswer, setStretchAnswer] = useState<'yes' | 'no' | null>(null);
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
          text: 'Got it. I will keep that in mind for next time.',
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
    <main data-surface="deep" className="flex flex-col h-dvh">
      <header className="flex items-center gap-2 px-2 h-14 shrink-0">
        <BlobLogo surface="deep" size={36} label="HeyPal, go to home" />
        <BackButton href="/home" />
        <h1 className="flex-1 text-lg font-bold text-[var(--white)] truncate">
          Private planner chat
        </h1>
        <HeyMenu surface="deep" items={MENU_ITEMS} current="/hub/planner" />
      </header>

      <div className="private-surface px-4 py-2 border-b border-[var(--color-hairline)] flex items-center gap-2">
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
                className="w-8 h-8 rounded-full bg-[var(--orange)] text-[var(--ink)] flex items-center justify-center text-xs font-bold shrink-0 mt-1"
                aria-hidden="true"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 1l1.8 4.6L14 7l-4.2 1.4L8 13l-1.8-4.6L2 7l4.2-1.4L8 1z" />
                </svg>
              </div>
            )}
            <div
              className={`max-w-[80%] flex flex-col gap-1 ${msg.from === 'me' ? 'items-end' : 'items-start'}`}
            >
              {msg.kind === 'stretch_ask' ? (
                <Card className="border-[var(--color-accent)]">
                  <p className="text-sm text-[var(--ink)] mb-2">{msg.text}</p>
                  <p className="text-xs text-[var(--ink-muted)] mb-3">
                    Your usual budget:{' '}
                    <strong>
                      {formatMoney(MY_BUDGET_CENTS).replace('.00', '')}
                    </strong>{' '}
                    · This option:{' '}
                    <strong>
                      {formatMoney(FRIDAY_OUT_ESTIMATE_CENTS).replace(
                        '.00',
                        '',
                      )}
                    </strong>
                  </p>
                  {stretchAnswer === null ? (
                    <div className="flex gap-2">
                      <Button
                        fullWidth
                        variant="secondary"
                        onClick={() => answerStretch('yes')}
                      >
                        That is fine
                      </Button>
                      <Button
                        fullWidth
                        variant="secondary"
                        onClick={() => answerStretch('no')}
                      >
                        Keep my budget
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--ink-muted)]">
                      You said:{' '}
                      <strong>
                        {stretchAnswer === 'yes'
                          ? 'That is fine'
                          : 'Keep my budget'}
                      </strong>
                    </p>
                  )}
                  <p className="mt-2 text-xs text-[var(--ink-muted)]">
                    The group never sees this ask or your answer.
                  </p>
                </Card>
              ) : (
                <div
                  className={`rounded-[22px] px-4 py-2.5 text-base ${
                    msg.from === 'me'
                      ? 'bg-[var(--royal)] text-[var(--white)] rounded-tr-md'
                      : 'bg-[var(--mist)] text-[var(--ink)] rounded-tl-md'
                  }`}
                >
                  {msg.text}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-4 pt-2">
        <div className="hey-composer-frame">
          <div className="hey-composer-inner">
            <div className="flex gap-2">
              <label htmlFor="planner-input" className="sr-only">
                Message planner
              </label>
              <input
                id="planner-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Message your planner"
                className="flex-1 min-h-[44px] rounded-3xl bg-[var(--white)] border border-[var(--sky)] px-4 text-base text-[var(--ink)]"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="grid place-items-center w-11 h-11 rounded-full bg-[var(--deep)] text-[var(--white)]"
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
        </div>
      </div>
    </main>
  );
}
