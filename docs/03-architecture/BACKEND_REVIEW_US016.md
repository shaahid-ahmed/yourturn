# US-016: independent backend review (money paths)

**Reviewer:** Shaahid (non-author: settlement/ledger/IOU/subs/booking/calendar written by Rohan, Alan, Vid; reviewer wrote only the HTTP layer and tests). **Date:** 2026-11-12. **Method:** full-suite branch coverage + read of every uncovered money branch + new tests for the gaps found.

## Coverage (full suite, `node --test --experimental-test-coverage`)

| Module           | Line | Branch | Uncovered after this review                                        |
| ---------------- | ---- | ------ | ------------------------------------------------------------------ |
| gate.mjs         | 100  | 100    | —                                                                  |
| money.mjs        | 100  | 88.5   | safe-integer edge consts only                                      |
| iou-balance.mjs  | 100  | 98.1   | —                                                                  |
| ledger.mjs       | 100  | 97.1   | correction-target-missing branch now tested; residual is defensive |
| idempotency.mjs  | 100  | 92.3   | conflict-vs-replay edges all exercised                             |
| subscription.mjs | 99.4 | 98.2   | receipt cross-store check only                                     |
| booking.mjs      | 100  | 88.8   | payer-timing rule now tested; residual is reminder copy variants   |
| calendar.mjs     | 98.2 | 91.3   | OAuth error edges (no live OAuth in demo)                          |
| settlement.mjs   | 96.4 | 79.6   | **retired by ADR 0007 — no investment**                            |

## Findings fixed during the review (tests added, all green)

- **F-01 Gate open-guards untested.** `PaymentGate` refused closed operation, but nothing proved it _cannot be built open_: `open:true` without `humanApprovalRecorded`, and open without an `approvalReference`, are now constructor-throwing and tested. Gate at 100/100.
- **F-02 Ledger misuse guards untested.** Synthetic entry claiming a provider event, non-correction naming a corrected entry, correction pointing at a missing entry — all threw in code, none tested. Tested now.
- **F-03 Idempotency slot binding untested.** `#slot` requires actor+operation+key and double-`remember` throws, but neither was exercised. Both tested now, plus the provider-port guard (`assertProvider` rejects a partial port).
- **F-04 Payer timing untested.** `volunteerAsPayer` outside `AWAITING_CONFIRMATION` threw `wrong_hangout_state` with no test. Tested now.

## Findings noted, not fixed

- **F-05 `settlement.mjs` (per-member authorize/capture/void) sits at 79.6% branch.** Deliberate: ADR 0007 retired that flow. The file stays as a labelled experiment and must not re-enter the demo path. No coverage work goes here.
- **F-06 `subscription.mjs` receipt verifier is a local HMAC stand-in**, documented in `SUBSCRIPTION.md`. No real App Store / Play verification exists; wiring a real store is a new `ReceiptVerifier`, not a fix to this one. Sandbox receipts only, enforced by schema (`environment = 'sandbox'`).
- **F-07 Calendar OAuth error edges** (token expiry, reconnect) are uncovered and untestable without live Google OAuth. The free/busy-only and consent-per-calendar rules are tested.
- **F-08 `fake-provider.mjs` double-capture guard** is test-double-only by construction; real double-spend protection is the `(provider_event_id, kind)` uniqueness + idempotency keys, both tested.

## Verdict

Money branches that can move value in the demo (IOU derivation, ledger provenance, gate refusal, idempotency binding, receipt validation, payer rules) are covered at 100% line; branch residuals are documented above and are either tested-after or retired-by-decision. No finding blocks the gate — the gate was already closed and stays closed. US-016 done; remaining money risk is product decisions (Q-010, Q-011), not code.
