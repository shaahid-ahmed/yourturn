# ADR 0008 — The payer pays the venue directly; the app never moves money

- **Status:** accepted (human-delegated decision, 2026-11-12; reversible by explicit human reversal).
- **Context:** Q-010 asked which PayPal product can pay a personal sandbox account. The UX spec (ADR 0007 source of truth) offers an alternative in its decision 4: the payer pays the venue however the venue accepts payment, and the app only tracks IOUs.
- **Decision:** adopt the alternative. The payer settles with the venue out of band (card, cash, whatever the venue takes). Between friends, the app records who owes whom (US-005 IOU ledger) and shows settle-up balances. No PayPal product is integrated, no webhook is consumed, no capture/void/refund runs anywhere.

## Consequences

- **Q-010 CLOSED** — answered by product choice, not by testing a PayPal product. No venue payment flow exists in the app.
- **US-006 RETIRED, never built.** Member-to-member PayPal settlement does not exist; settle-up happens outside the app (cash, existing payment apps, or not at all). The `createSettlementPayment` route stays `409 payment_gate_blocked` as a contract placeholder, never a flow.
- **Q-012 CLOSED as moot.** No in-app transfer means no money-transmission question. Residual app-store and privacy compliance items are ordinary app matters, not money movement.
- **The payment gate is permanently shut**, not pending. There is nothing to open: approval would have nothing to approve. `GateClosedError` remains the honest answer on every money route.
- **US-015 (security/legal) unblocked in part:** the P2P transfer questions (L-1–L-5) and webhook handler review (S-1) are moot — there is no handler and no transfer. The threat model, authz matrix and abuse cases already landed stay valid; member-to-member references in them are read as out-of-band settle-up.
- **US-302 E2E unblocked:** the happy path ends at split confirmation + visible IOU balances. "Settlement" in E2E means the ledger reads `owed`, never a PayPal movement.

## What would reopen this

A human explicitly directing a real money flow (e.g., in-app settle-up), with a named PayPal product, verified sandbox evidence, counsel review, and a recorded gate opening. That reopens Q-010, Q-012 and US-006 together — never one alone.
