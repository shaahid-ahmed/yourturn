'use client';
// P1 — Splash
// Animated logo on every open. Routes to /signin if signed out, /home if signed in.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    // Demo: always go to sign-in after the logo animation.
    const t = setTimeout(() => router.replace('/signin'), 1800);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <main
      className="flex flex-col items-center justify-center min-h-dvh bg-[var(--color-accent)]"
      aria-label="Unspoken loading"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="flex flex-col items-center gap-4 animate-[spin_1.2s_ease-in-out_1]"
        style={{ animationFillMode: 'forwards' }}
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          aria-label="Unspoken logo"
          role="img"
          fill="none"
        >
          <circle cx="40" cy="40" r="36" stroke="white" strokeWidth="3" />
          <circle cx="40" cy="40" r="20" fill="white" opacity="0.15" />
          <path
            d="M28 40 Q40 24 52 40 Q40 56 28 40Z"
            fill="white"
          />
        </svg>
        <span className="text-white text-2xl font-bold tracking-tight">Unspoken</span>
      </div>
    </main>
  );
}
