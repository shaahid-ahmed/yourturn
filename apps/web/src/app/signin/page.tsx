'use client';
// P2, Sign in on deep blue. Login pill, dotted phone field, six code rings.
// Same behavior: 10+ digits to send, code expires in 10 minutes.
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDocumentTitle } from '@/components/ui';

type Step = 'phone' | 'code';

export default function SignInPage() {
  useDocumentTitle('Sign in');
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [codeError, setCodeError] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setPhoneError('Enter a valid phone number (10+ digits).');
      return;
    }
    setPhoneError('');
    setStep('code');
  }

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 4) {
      setCodeError('Enter the code we sent you.');
      return;
    }
    setCodeError('');
    router.push('/subscribe');
  }

  return (
    <main
      data-surface="deep"
      className="flex flex-col min-h-dvh px-6 pt-16 pb-8"
    >
      <div className="mb-10 text-center">
        <p className="hey-wordmark" aria-hidden="true">
          HeyPal
        </p>
      </div>

      <div className="mb-8">
        <h1 className="text-[32px] font-bold text-[var(--white)]">
          {step === 'phone' ? "What's your number?" : 'Enter the code'}
        </h1>
        <p className="mt-2 text-base text-[var(--mist)]">
          {step === 'phone'
            ? "We'll send a one-time code to verify your number."
            : `We sent a code to ${phone}. It expires in 10 minutes.`}
        </p>
      </div>

      {step === 'phone' ? (
        <form
          onSubmit={handlePhoneSubmit}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor="phone"
              className="text-sm font-medium text-[var(--white)]"
            >
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              aria-invalid={!!phoneError}
              aria-describedby={phoneError ? 'phone-error' : undefined}
              className="hey-dot-input"
            />
            {phoneError && (
              <p
                id="phone-error"
                role="alert"
                className="text-sm text-[var(--orange)] font-semibold"
              >
                <span aria-hidden="true">! </span>
                {phoneError}
              </p>
            )}
          </div>
          <button type="submit" className="hey-btn hey-btn--primary w-full">
            Send code
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleCodeSubmit}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="code-entry"
              className="text-sm font-medium text-[var(--white)]"
            >
              One-time code
            </label>
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => codeRef.current?.focus()}
              className="flex gap-2 justify-between bg-transparent border-none p-0 cursor-text"
            >
              {Array.from({ length: 6 }, (_, i) => (
                <span
                  key={i}
                  className={
                    code.length > i
                      ? 'hey-code-ring hey-code-ring--filled'
                      : 'hey-code-ring'
                  }
                >
                  {code[i] ?? ''}
                </span>
              ))}
            </button>
            <input
              ref={codeRef}
              id="code-entry"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="sr-only"
              aria-describedby={codeError ? 'code-error' : undefined}
            />
            {codeError && (
              <p
                id="code-error"
                role="alert"
                className="text-sm text-[var(--orange)] font-semibold"
              >
                <span aria-hidden="true">! </span>
                {codeError}
              </p>
            )}
          </div>
          <button type="submit" className="hey-btn hey-btn--primary w-full">
            Continue
          </button>
          <button
            type="button"
            className="hey-btn hey-btn--ghost w-full text-[var(--mist)]"
            onClick={() => {
              setStep('phone');
              setCode('');
              setCodeError('');
            }}
          >
            Use a different number
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-[var(--mist)]">
        New here?{' '}
        <button
          type="button"
          className="underline underline-offset-4 font-medium"
          onClick={() => setStep('phone')}
        >
          Create your account
        </button>{' '}
        with the same number flow.
      </p>

      <footer className="mt-auto pt-8 text-center">
        <p className="text-[13px] text-[var(--sky)]">
          By continuing you agree to our{' '}
          <Link href="#" className="underline inline-block py-3">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="#" className="underline inline-block py-3">
            Privacy policy
          </Link>
          .
        </p>
      </footer>
    </main>
  );
}
