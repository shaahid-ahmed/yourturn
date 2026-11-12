# Payments — verified mechanism, unapproved flow

**Status:** mechanism **verified in sandbox** (YT-006 go), money flow **not approved**. The payment gate stays closed until a human approves the flow (RULES rule 24). Decision and evidence: [ADR 0005](../decisions/0005-venue-payment-via-payouts.md).
**Owner:** Payments. Architect approves contracts; human approves money flow. Tasks: YT-006 (done, go) and YT-017 (blocked on freeze + approval). Human owner: Shaahid, Lane S.

## Product intent, corrected

Monthly sandbox subscriptions contribute to a conceptual ledger-derived pot. After deterministic host approval, the venue is paid **from the collector account's balance using the Payouts API** — not with Orders/Checkout.

The brief's "pot pays the venue through Orders/Checkout" is not implementable: Orders is buyer-initiated and cannot spend funds a merchant already holds. ADR 0005 records the correction, with executed evidence. The host never receives cash: the payout recipient is the venue account, never a member.

A local ledger balance is still not a funding source. The pot is derived from verified entries; the real spendable money is the collector account's PayPal balance, which the demo environment must keep funded.

## Go/no-go evidence — recorded 2026-11-11

Sandbox only, app `APP-7J2002686X0070045`, credentials in ignored local configuration.

| Leg                   | Evidence                                                                                                                                                    | Verdict                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Auth                  | `POST /v1/oauth2/token` HTTP 200; payouts and subscription scopes granted                                                                                   | pass                                                                  |
| Plan                  | `POST /v1/catalogs/products` → `PROD-3K282225S7986580D`; `POST /v1/billing/plans` → `P-8AW24653TA0269907NL2PYKA` ACTIVE, $5.00/month                        | pass                                                                  |
| Contribution in       | `POST /v1/billing/subscriptions` → `I-RPU70L1FAUWH`, `APPROVAL_PENDING`                                                                                     | **incomplete** — payer approval outstanding, no contribution received |
| **Venue payment out** | `POST /v1/payments/payouts` → batch `CLAPZR33X2P32` `PENDING`; `GET` readback → `SUCCESS`, item `SUCCESS`, 12.00 USD, txn `0VL83865553929934`, fee 0.25 USD | **pass**                                                              |
| Webhook               | not configured — no public HTTPS listener exists                                                                                                            | **blocked**, YT-032                                                   |

Outstanding before YT-017: activate the subscription through payer approval and observe a real contribution event; subscribe a webhook listener and verify a signature end to end; confirm reconciliation after a forced failure.

Standing rules: created ≠ active ≠ paid; `PENDING` ≠ `SUCCESS`; a webhook-simulator event is never payment evidence; missing credentials mean BLOCKED, not FAILED. ADR 0003 stays unused — the venue payment succeeded, so no simulated fallback is proposed or permitted by default.

## Every provider call

| #   | Call                                                                                   | Purpose                              | Idempotency                                                                               | Evidence rule                                                                                      |
| --- | -------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | `POST /v1/oauth2/token` (Basic auth, `client_credentials`)                             | Access token, ~9h                    | n/a                                                                                       | Cache and refresh before expiry; never log the token                                               |
| 2   | `POST /v1/catalogs/products`                                                           | Catalog product for the contribution | `PayPal-Request-Id`                                                                       | Create once per environment; store the id                                                          |
| 3   | `POST /v1/billing/plans`                                                               | $5.00/month plan, 500 integer cents  | `PayPal-Request-Id`                                                                       | Plan must read back `ACTIVE` before use                                                            |
| 4   | `POST /v1/billing/subscriptions`                                                       | Member's contribution arrangement    | `PayPal-Request-Id`                                                                       | Returns `APPROVAL_PENDING` plus an approve link; never treat the link or the return URL as payment |
| 5   | `GET /v1/billing/subscriptions/{id}`                                                   | Readback of real state               | n/a                                                                                       | The only trusted source for `ACTIVE` / `last_payment`                                              |
| 6   | `POST /v1/payments/payouts`                                                            | **Pay the venue from the pot**       | `PayPal-Request-Id` **and** a unique `sender_batch_id` that the provider rejects on reuse | Create returns `PENDING`; record no ledger effect yet                                              |
| 7   | `GET /v1/payments/payouts/{batch_id}`                                                  | Terminal batch and item status       | n/a                                                                                       | `SUCCESS` here, or a verified webhook, is the only basis for a ledger entry                        |
| 8   | `POST /v1/notifications/verify-webhook-signature`, or local cryptographic verification | Authenticate inbound events          | n/a                                                                                       | Verify **before** any effect; mock events cannot be postback-verified                              |

No Orders/Checkout call is used for the venue payment. No refund, reversal or Payouts-refund implementation is in scope: payout reversal is not an Order refund, and its semantics are a Legal question under Q-006.

Rule 8 is unchanged. Q-005 remains open on per-endpoint header semantics; the `sender_batch_id` guard is what actually prevents a duplicate payout, and internal operation keys plus verified-event deduplication remain mandatory regardless.

## State machine

```text
contribution:  plan ACTIVE ─▶ subscription CREATED ─▶ APPROVAL_PENDING
                                   │ payer approves (browser, out of band)
                                   ▼
                             ACTIVE ─▶ payment received (verified event only)

venue payment: host approval (deterministic, snapshot re-checked)
                     │ gate open + human approval required
                     ▼
               payout PENDING ──readback/webhook──▶ SUCCESS  ─▶ 2 ledger entries
                     │                                           (amount, fee)
                     └──────────────────────────▶ DENIED/FAILED ─▶ no entry, honest failure state
```

Distinct, never inferred from one another: subscription created / approval-pending / active / payment-received; payout pending / success / denied / failed; and **reservation**, which this demo never performs.

## Ledger and concurrency

- Every payout writes **two** negative integer-cent entries — the venue amount and the provider fee (0.25 USD observed on 12.00 USD) — both keyed to one verified provider event. Omitting the fee entry makes the derived pot drift from the real balance.
- `ledger_entry.provider_event_id` is unique, so a replayed event cannot double-apply. Two entries per payout share one event id, so the uniqueness constraint moves to `(provider_event_id, kind)`; `DATA_MODEL.md` needs that amendment at freeze.
- Integer cents convert to the provider's decimal string only at the boundary, and the response amount is re-parsed and compared before any entry is written.
- The pot is re-derived inside the approving transaction, so concurrent approvals cannot both pass a budget check.
- The sender balance is a second, external constraint: a payout can fail for insufficient funds even when the derived pot looks sufficient. That failure must surface honestly rather than as a retry loop.
- **Divergence invariant (OSS-01).** The derived pot and the collector account's PayPal balance are two different numbers that can legitimately disagree — unsettled contributions, provider fees, and sandbox funding all move one without the other. The rule: **the derived pot is an upper bound on what may be spent, never a promise that the money is there**, and the provider balance is authoritative for whether a payout can execute. A divergence is therefore not an error to be corrected by writing a ledger entry; the ledger may only ever be changed by a verified provider event. When a payout fails for insufficient balance while the derived pot is sufficient, the demo must show that honestly as an environment problem, and **no compensating or plug entry may be written** to make the two agree. Reconciliation is read-only: compare, report, never adjust.

## Tests and approval

Required before YT-017 can close: 100% branch coverage of money logic; invalid and missing signature; duplicate and out-of-order verified events; reused `sender_batch_id`; stale host approval; insufficient sender balance; concurrent approvals; timeout after a possible payout; terminal non-`SUCCESS` batch; cancellation, leave and pause interactions; and reconciliation by readback.

Approval gates: Architect for the contract change, Security for ingress and secrets, Legal for Q-006, Behavioral where member-facing money states are shown, independent Reviewer, and an explicit human money-flow approval. None of these is satisfied by the sandbox evidence above.
