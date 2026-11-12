'use client';
// P2 — Sign in
// Phone number field → OTP entry → continue.
// Sign-in method is not yet chosen (backend section 12).
import { useState } from 'react';
import { Button, Input, useDocumentTitle } from '@/components/ui';

type Step = 'phone' | 'code';

export default function SignInPage() {
  useDocumentTitle('Sign in');
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [codeError, setCodeError] = useState('');

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
    // Demo: go to subscription page
    window.location.href = '/subscribe';
  }

  return (
    <main className="flex flex-col min-h-dvh px-6 pt-12 pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-ink)]">
          {step === 'phone' ? "What's your number?" : 'Enter the code'}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
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
          <Input
            label="Phone number"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={phoneError}
            placeholder="+1 (555) 000-0000"
          />
          <Button type="submit" fullWidth>
            Send code
          </Button>
        </form>
      ) : (
        <form
          onSubmit={handleCodeSubmit}
          className="flex flex-col gap-5"
          noValidate
        >
          <Input
            label="One-time code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            error={codeError}
            placeholder="123456"
          />
          <Button type="submit" fullWidth>
            Continue
          </Button>
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={() => {
              setStep('phone');
              setCode('');
              setCodeError('');
            }}
          >
            Use a different number
          </Button>
        </form>
      )}

      <footer className="mt-auto pt-8 text-center">
        <p className="text-xs text-[var(--color-ink-muted)]">
          By continuing you agree to our{' '}
          <a href="#" className="underline inline-block py-3">
            Terms
          </a>{' '}
          and{' '}
          <a href="#" className="underline inline-block py-3">
            Privacy policy
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
