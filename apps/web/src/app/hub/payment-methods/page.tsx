'use client';
// P21, Payment methods. A list of linked PayPal accounts the server sends
// (nickname and last digits only). The app never reads card numbers.
import { useState } from 'react';
import {
  ScreenHeader,
  BackButton,
  Button,
  Card,
  SandboxBanner,
} from '@/components/ui';

export default function PaymentMethodsPage() {
  const [linked, setLinked] = useState(true);

  return (
    <main data-surface="white" className="flex flex-col min-h-dvh">
      <SandboxBanner />
      <ScreenHeader
        title="Payment methods"
        back={<BackButton href="/home" />}
      />

      <div className="flex flex-col gap-5 px-4 py-5">
        <section aria-labelledby="paypal-heading">
          <h2
            id="paypal-heading"
            className="text-sm font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-3"
          >
            PayPal
          </h2>
          {linked ? (
            <Card>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full border-2 border-dotted border-[var(--blue-mid)] bg-[var(--pale)] text-[var(--ink)] flex items-center justify-center font-bold text-sm"
                  aria-hidden="true"
                >
                  J
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">
                    Janani, PayPal ending 0101
                  </p>
                  <p className="text-[13px] text-[var(--ink-muted)]">
                    Default · Demo only, no real account
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-[var(--ink)] mb-3">
                Paying with PayPal
              </p>
              <p className="text-[13px] text-[var(--ink-muted)] mb-3">
                Required to be the payer for a hangout. Used to send and receive
                payments between friends. The app never holds your funds.
              </p>
              <Button
                variant="destructive"
                fullWidth
                onClick={() => setLinked(false)}
              >
                Unlink PayPal
              </Button>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-[var(--ink-muted)] mb-3">
                No PayPal account linked. You can still participate in hangouts;
                you just cannot be the payer.
              </p>
              <Button fullWidth onClick={() => setLinked(true)}>
                Add a payment method
              </Button>
            </Card>
          )}
        </section>

        <div className="rounded-[28px] border-2 border-dotted border-[var(--sky)] p-3 text-[13px] text-[var(--ink-muted)]">
          Paying friends through PayPal is turned off in this sandbox demo. No
          money is held or moved.
        </div>
      </div>
    </main>
  );
}
