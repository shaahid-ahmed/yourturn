'use client';
// P3, Subscription on deep blue. Same copy and rules, dotted checks,
// one primary DotButton, Restore purchase as a ghost link.
import { useRouter } from 'next/navigation';
import { useDocumentTitle } from '@/components/ui';
import { PLAN_PRICE_CENTS, formatMoney } from '@/lib/heypal/seed';

const FEATURES = [
  'AI planner finds and suggests plans in NYC',
  'Group polls for activities and times',
  'Booking with your explicit approval',
  'PayPal splitting between friends',
];

export default function SubscribePage() {
  useDocumentTitle('Subscription');
  const router = useRouter();
  const planPrice = formatMoney(PLAN_PRICE_CENTS);
  const go = () => router.push('/profile/create');

  return (
    <main
      data-surface="deep"
      className="flex flex-col min-h-dvh px-6 pt-12 pb-8"
    >
      <div className="mb-8">
        <h1 className="text-[32px] font-bold text-[var(--white)]">
          Start planning together
        </h1>
        <p className="mt-2 text-base text-[var(--mist)]">
          HeyPal is <strong>{planPrice} a month</strong>. Billed through the app
          store.
        </p>
      </div>

      <ul
        className="flex flex-col gap-4 mb-8"
        role="list"
        aria-label="What's included"
      >
        {FEATURES.map((f) => (
          <li
            key={f}
            className="flex items-start gap-3 text-base text-[var(--white)]"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              aria-hidden="true"
              fill="var(--mist)"
              className="shrink-0 mt-0.5"
            >
              <circle cx="5" cy="11" r="2.4" />
              <circle cx="11" cy="11" r="2.4" />
              <circle cx="17" cy="11" r="2.4" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <div className="rounded-[28px] border-2 border-dotted border-[var(--mist)] p-4 mb-6 text-sm text-[var(--mist)]">
        <strong className="text-[var(--white)]">Note:</strong> The {planPrice}{' '}
        subscription covers the planner service. Hangout money moves between
        friends through PayPal, and the app never holds your funds. This is a
        demo, and no charge is made.
      </div>

      <div className="flex flex-col gap-3 mt-auto">
        <button
          type="button"
          onClick={go}
          className="hey-btn hey-btn--primary w-full"
        >
          Start {planPrice}/month plan
        </button>
        <button
          type="button"
          onClick={go}
          className="hey-btn hey-btn--ghost w-full text-[var(--mist)]"
        >
          Restore purchase
        </button>
      </div>
    </main>
  );
}
