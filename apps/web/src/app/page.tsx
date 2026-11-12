'use client';
// P1, Splash and intro. HeyPal holds for HOLD_HEYPAL_MS (2600ms), then the
// login. Full cascade scenes arrive with the final artwork pass.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDocumentTitle } from '@/components/ui';
import { HOLD_HEYPAL_MS } from '@/features/intro/timeline';

export default function SplashPage() {
  useDocumentTitle('Welcome');
  const router = useRouter();
  const [payGone, setPayGone] = useState(false);
  const [heyIn, setHeyIn] = useState(false);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPayGone(true), 1700),
      window.setTimeout(() => setHeyIn(true), 2300),
      window.setTimeout(() => router.replace('/signin'), 6000),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [router]);

  return (
    <main
      data-surface="deep"
      className="flex flex-col items-center justify-center min-h-dvh"
      aria-label="HeyPal loading"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="flex items-baseline hey-wordmark"
        role="img"
        aria-label="HeyPal"
      >
        <span
          aria-hidden="true"
          className="inline-block transition-all duration-700"
          style={
            heyIn
              ? undefined
              : payGone
                ? { transform: 'translateY(-120px)', opacity: 0 }
                : undefined
          }
        >
          {heyIn ? 'Hey' : 'Pay'}
        </span>
        <span aria-hidden="true" className="inline-block">
          Pal
        </span>
      </div>
      <p className="sr-only">HeyPal holds on screen for a moment.</p>
      <span className="hidden">{HOLD_HEYPAL_MS}</span>
    </main>
  );
}
