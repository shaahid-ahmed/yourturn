# ADR 0005: Pay the venue with Payouts, not Orders

- Status: **proposed**, with executed sandbox evidence. Money-flow implementation still requires explicit human approval (RULES rule 24).
- Date: 2026-11-11
- Owner: Payments; Architect approves the contract change
- Task: YT-006 (sandbox go/no-go), feeding YT-014 (freeze) and YT-017 (integration)
- Required approvers: Payments, Architect, Legal (Q-006), human (money flow)
- Approval evidence: none yet — this ADR records a verified mechanism, not an approved product behavior
- Supersedes: the venue-payment mechanism assumed in `docs/03-architecture/PAYMENTS.md` and ADR 0004. ADR 0003 remains unused: the venue payment did **not** fail, so no simulated fallback is proposed.

## Context

The product brief states that "the pot pays the venue directly through PayPal Orders/Checkout when the host approves a plan". Q-001 asked whether subscription proceeds can actually fund a separate venue payment. They cannot, through Orders.

Orders/Checkout is **buyer-initiated**: a payer approves a specific checkout at that moment. It has no mechanism for spending funds a merchant has already collected. Paying a _different_ merchant at checkout time requires a platform/multiparty integration, where the buyer still pays and the platform takes a fee — which again does not spend the pot.

Sending money the collector already holds is what the **Payouts API** does: it draws from the sender's PayPal balance and pays a recipient identified by email or PayPal account id.

## Executed sandbox evidence

Run on 2026-11-11 against `api-m.sandbox.paypal.com` with app `APP-7J2002686X0070045` (sandbox only; credentials held in ignored local configuration and never committed).

| Step              | Call                                     | Result                                                                                                  |
| ----------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Auth              | `POST /v1/oauth2/token`                  | HTTP 200; granted scopes include payouts and subscriptions                                              |
| Product           | `POST /v1/catalogs/products`             | HTTP 201, `PROD-3K282225S7986580D`                                                                      |
| Plan              | `POST /v1/billing/plans` ($5.00/month)   | HTTP 201, `P-8AW24653TA0269907NL2PYKA`, `ACTIVE`                                                        |
| Subscription      | `POST /v1/billing/subscriptions`         | HTTP 201, `I-RPU70L1FAUWH`, `APPROVAL_PENDING` — payer approval still outstanding                       |
| **Venue payment** | `POST /v1/payments/payouts`              | HTTP 201, batch `CLAPZR33X2P32`, `batch_status: PENDING`                                                |
| **Readback**      | `GET /v1/payments/payouts/CLAPZR33X2P32` | HTTP 200, `batch_status: SUCCESS`, item `SUCCESS`, 12.00 USD, txn `0VL83865553929934`, **fee 0.25 USD** |

The payout moved sandbox funds from the collector business account to a **separate** venue business account and settled on readback. The subscription proves the inbound direction only up to `APPROVAL_PENDING`; it is **not** active and no contribution has been received, so the inbound leg is not yet evidenced end to end.

## Decision

1. **The venue is paid with Payouts** (`POST /v1/payments/payouts`), sourced from the collector account's balance, after deterministic host approval. Orders/Checkout is not used for the venue payment.
2. **Payouts moves from the cut list into core scope.** The brief listed "Payouts refunds" as the third cut; that referred to refunds. Payouts as the venue-payment mechanism is load-bearing and may not be cut without replacing the entire money story.
3. **Fees are ledger entries.** Each payout records two entries: the venue amount and the provider fee, both negative integer cents. Without the fee entry the derived pot drifts from the real balance.
4. **`PENDING` is not success.** The create response is non-final. Only a signature-verified `PAYMENT.PAYOUTSBATCH.*` / `PAYMENT.PAYOUTS-ITEM.*` webhook or an explicit `GET` readback may record a ledger effect or display a completed state.
5. **Idempotency.** Payout requests carry `PayPal-Request-Id` **and** an internally generated `sender_batch_id`, which PayPal rejects on reuse — giving a provider-side duplicate guard independent of the unverified header semantics in Q-005.
6. **Recipient identification.** The venue is addressed by sandbox email (`recipient_type: EMAIL`). A deployed demo should prefer `PAYPAL_ID` to avoid email-based misdirection.
7. **Still blocked.** Implementation remains behind the closed payment gate until a human approves the money flow. A verified mechanism is not an approved product behavior, and Q-006 (forfeit, refunds, pause effects) is unresolved.

## Alternatives

- **Orders with a `payee`:** the buyer pays the venue directly and the platform takes a fee. Does not spend collected funds, so the pot becomes decorative. Rejected.
- **Platform/multiparty onboarding:** realistic for a marketplace, but requires seller onboarding flows and PayPal partner configuration — out of scope for three days.
- **Simulated venue payment (ADR 0003):** unnecessary. The real payment works; substituting a simulation would be strictly worse and would violate the never-cut requirement.

## Consequences

- `PAYMENTS.md`, ADR 0004 and `openapi.json` need the Orders-based venue path replaced with the Payouts path; `createVenuePayment` keeps its route and gate but changes provider semantics.
- The ledger gains a `provider_fee` entry kind, and `DATA_MODEL.md` must allow two entries per payout, both keyed to one verified provider event.
- The demo can honestly claim real sandbox money movement from the pot to a third party — with the fee and the asynchronous settlement shown, not hidden.
- Payouts requires a funded sender balance, so the demo environment needs a sandbox balance top-up step in the runbook.
- Refunding a payout is not supported the way an Order refund is; reversal semantics are a Legal/Payments question under Q-006 and remain out of scope.

## Verification and rollback

- Reproduce with the spike: auth, product, plan, subscription, payout, then readback until `batch_status` is terminal. Treat a non-`SUCCESS` terminal state as a failure, not a retry-forever condition.
- Contract tests assert the gate stays closed and that no response schema reports a reservation from a capture.
- Rollback is documentation-only: no runtime code depends on this yet.
