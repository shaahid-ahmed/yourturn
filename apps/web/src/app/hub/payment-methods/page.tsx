'use client';
// P21 — Payment methods
// Linked PayPal account.
import { useState } from 'react';
import { ScreenHeader, BackButton, Button, Card, SandboxBanner } from '@/components/ui';

export default function PaymentMethodsPage() {
  const [linked, setLinked] = useState(true);

  return (
    <main className="flex flex-col min-h-dvh">
      <SandboxBanner />
      <ScreenHeader title="Payment methods" back={<BackButton href="/home" />} />

      <div className="flex flex-col gap-5 px-4 py-5">
        <section aria-labelledby="paypal-heading">
          <h2 id="paypal-heading" className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">PayPal</h2>
          {linked ? (
            <Card>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#003087] text-white flex items-center justify-center font-bold text-sm" aria-hidden="true">PP</div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-ink)]">alex@example.com</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">Linked · Demo only — no real account</p>
                </div>
              </div>
              <p className="text-xs text-[var(--color-ink-muted)] mb-3">
                Required to be the payer for a hangout. Used to send and receive payments between friends.
                The app never holds your funds.
              </p>
              <Button variant="destructive" fullWidth onClick={() => setLinked(false)}>
                Unlink PayPal
              </Button>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-[var(--color-ink-muted)] mb-3">No PayPal account linked. You can still participate in hangouts; you just can't be the payer.</p>
              <Button fullWidth onClick={() => setLinked(true)}>Link PayPal</Button>
            </Card>
          )}
        </section>

        <div className="rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border)] p-3 text-xs text-[var(--color-ink-muted)]">
          Which PayPal product moves money between friends is open (section 12 of spec). No funds are held or moved in this demo.
        </div>
      </div>
    </main>
  );
}
