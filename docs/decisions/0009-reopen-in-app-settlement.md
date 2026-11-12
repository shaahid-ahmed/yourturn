# ADR 0009 — Reopen in-app sandbox settlement (reverses ADR 0008)

- **Status:** accepted (explicit human reversal, 2026-11-12; human chose "PayPal sandbox in-app settle-up" over app-store-only).
- **Reverses:** ADR 0008 (payer-pays-venue-directly, app tracks IOUs only).
- **Decision:** the app will move member-to-member settlement money through PayPal **sandbox** while the gate process runs. Production remains untouched and forbidden.

## What reopens, what does not

- **Q-010 REOPENED** — which PayPal product can pay a personal sandbox account is once again an empirical question, to be answered by building the sandbox flow and observing it (expected product: Payouts, `recipient_type: EMAIL`, sandbox business sender → personal recipient).
- **Q-012 REOPENED** — in-app transfer is back, so the money-transmission question is live again.
- **US-006 UN-RETIRED** — member-to-member PayPal settlement returns to TODO as active, owned work.
- **US-015 REOPENED as BLOCKED** — its webhook review (S-1) and P2P items (L-1–L-5) are live again; the ADR 0008 mootness no longer applies.
- **The payment gate stays CLOSED.** Reversing the product decision is not opening the gate. `409 payment_gate_blocked` remains the answer on every money route until: (a) sandbox evidence exists end-to-end (payout batch + webhook or API readback, no unverified return URLs, `PENDING` never recorded as success), (b) counsel answers L-1–L-5, (c) a human records the opening. Only sandbox money may move before then.

## Build order

1. Sandbox Payouts adapter (business sender → personal recipient email) with hashed `custom_id`.
2. `createSettlementPayment` route: idempotency bound to target+body, balance → `owed` on failure, never record `PENDING` as success.
3. Sandbox webhook ingestion with signature verification; API-readback as evidence fallback.
4. US-015 review of the handler, then the gate checklist.

## What would close this again

A human directing a return to ADR 0008 (no in-app money), which retires US-006, closes Q-010/Q-012, and re-moots US-015 — the exact inverse of this record.
