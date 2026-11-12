'use client';
// P1 — Splash
// Animated logo on every open. Routes to /signin if signed out, /home if signed in.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDocumentTitle } from '@/components/ui';

export default function SplashPage() {
  useDocumentTitle('Welcome');
  const router = useRouter();

  useEffect(() => {
    // Demo: always go to sign-in after the logo animation.
    const t = setTimeout(() => router.replace('/signin'), 1800);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <main
      className="flex flex-col items-center justify-center min-h-dvh bg-[var(--color-paper)]"
      aria-label="Unspoken loading"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4">
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          aria-label="Unspoken logo"
          role="img"
          fill="none"
          className="logo-turn"
        >
          <circle
            cx="40"
            cy="40"
            r="36"
            stroke="var(--color-ink)"
            strokeWidth="3"
          />
          <circle cx="40" cy="40" r="20" fill="var(--color-bubble-3)" />
          <path d="M28 40 Q40 24 52 40 Q40 56 28 40Z" fill="var(--color-ink)" />
        </svg>
        <span className="fade-in text-[var(--color-ink)] text-[length:var(--text-display)] font-semibold tracking-tight [font-family:var(--font-serif)]">
          Unspoken
        </span>
      </div>
    </main>
  );
}
