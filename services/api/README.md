# services/api

Backend for Unspoken (ADR 0006). **Domain core only — there is no HTTP server yet.**

Everything here is UX-independent on purpose: the shapes below are fixed by the
money rules and the privacy rules, not by any screen.

## What exists, and is tested

| Module                                           | What it guarantees                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/money.mjs`                                  | Integer cents only. Shares always sum to the total, and the odd cent **rotates by hangout** so one member does not quietly subsidise every hangout. Provider amounts are re-parsed and compared, never rounded.                                                                                                                                   |
| `src/ledger.mjs`                                 | Append-only. **A hold is not money** — `share_authorized` is rejected as a ledger kind. Provenance is enforced: a non-synthetic entry needs a verified provider event. Three signed sums, and only `verifiedCents` may gate a payment. `(provider_event_id, kind)` uniqueness lets one event write an amount and its fee without double-applying. |
| `src/idempotency.mjs`                            | Binds `(actor, operation, key)` **plus target and a canonical body digest**. A reused key against a different hangout is a conflict, not a replay of the first hangout's success.                                                                                                                                                                 |
| `src/group.mjs`                                  | 3–8 members. The floor is a privacy rule: below three, one refusal is attributable. `readyToPlan()` is a boolean, so nobody can infer who is missing.                                                                                                                                                                                             |
| `src/hangout.mjs`                                | The lifecycle as a transition table. `COMMITTING → SETTLING` is the only route to a capture, so money cannot be taken from someone who never authorized it. No state means "booked" or "reserved".                                                                                                                                                |
| `src/constraints.mjs`                            | Hard rules in plain code, evaluated first. A soft score is bounded and **can never turn a reject into an accept**. A rejected candidate carries no score and no reason.                                                                                                                                                                           |
| `src/tally.mjs`                                  | Returns three fields: hangout, outcome, winner. No member ids, no scores, no refusal counts. A missing answer is an error, never consent.                                                                                                                                                                                                         |
| `src/vault.mjs`                                  | One AES-256-GCM record per member, keyed by HKDF from the master key and the member id, so one member's key cannot open another's record. Tampering fails loudly. `forget()` destroys it.                                                                                                                                                         |
| `src/payments/gate.mjs`                          | Cannot be constructed open without a recorded human approval **and** a reference to where it is recorded. No simulated-success path.                                                                                                                                                                                                              |
| `src/payments/settlement.mjs`                    | All-or-nothing in both directions. Opening commitments records no money; authorizations are recorded only from a **readback or a verified webhook** (a return-URL hit is refused); a capture asks the gate; a failed capture refunds the successes and ends `SETTLEMENT_FAILED`. Progress is a **count**, never names.                            |
| `src/payments/provider.mjs`, `fake-provider.mjs` | The provider port plus an in-memory PayPal stand-in that can be told to fail a capture or echo a wrong amount, so the failure paths are tested rather than assumed.                                                                                                                                                                               |

Run them: `npm test` from the repo root (`tests/domain-money.test.mjs`,
`tests/domain-core.test.mjs`, `tests/settlement.test.mjs`).

## What does NOT exist

- **No HTTP layer.** No routes, no auth, no sessions.
- **No persistence.** Everything is in memory; `node:sqlite` is available and intended.
- **No real PayPal adapter.** Only the port and the fake. The live calls are proven
  separately up to order creation (ADR 0006), not integrated here.
- **No LLM.** Constraint extraction from free text and coordinator candidate
  generation are UN-005 and UN-006.
- **No venue catalog or fixtures** — Lane A owns `tests/fixtures/**` and `infra/seed/**`.
- **The contract is stale.** `docs/03-architecture/openapi.json` still describes
  YourTurn and is rewritten in UN-001.

## Honest limits

The tally **sees** every per-member answer while it runs. The guarantee is a
boundary plus a retention rule, not cryptography, and repeated rounds can leak by
inference. Never describe it as cryptographically private.

A capture is not a booking. `venueConfirmed` is returned as `false` everywhere,
deliberately, because this demo never reserves anything.
