# Unspoken data model

**Status:** US-002 draft, migration 1. **Migrated and tested on a scratch SQLite file; not yet used by any route.** Contract: [API.md](API.md) and [openapi.json](openapi.json) `0.2.0-draft` (US-001). Rationale: [ADR 0007](../decisions/0007-ux-spec-supersedes-payment-flow.md).
**Owner:** Architect / Backend (US-002 is Rohan's). Money semantics are shared with Payments ([PAYMENTS.md](PAYMENTS.md)) and the US-005 IOU ledger; consent semantics with Privacy.

This replaces the YourTurn `v0.1.0-draft` model (circles, turns, contributions, pot), which ADR 0006 and ADR 0007 superseded.

**Where it lives.** `services/api/src/db/migrations.mjs` holds the schema as ordered migrations; `services/api/src/db/database.mjs` opens a database with foreign keys on and applies pending migrations. Both use Node's built-in `node:sqlite`, so there is no native dependency. The older in-memory modules in `services/api/src/` (Shaahid's ADR 0006 domain core) are untouched and are not wired to this schema.

## Rules the database enforces

These are enforced by SQLite itself (constraints and triggers), not only by application code, so a route bug cannot quietly break them. Each has a test in `tests/db-schema.test.mjs`.

1. **No stored balance.** No column is named for a balance, pot, amount owed or outstanding amount. A balance is the sum of `ledger_entry` rows for one (hangout, debtor, creditor).
2. **Append-only money and history.** `ledger_entry`, `split`, `split_actual_total`, `settlement_payment`, `provider_event`, `subscription_receipt`, `idempotency_record` and `hangout_transition` refuse `UPDATE` and `DELETE`. A correction is a new `adjustment` entry.
3. **Integer cents.** Every table is `STRICT`, so a money column rejects `12.5` and `'12.50'`; an integer string such as `'1250'` is stored as the integer 1250. Shares and payments are positive; only `adjustment` entries are signed.
4. **Provenance.** A real (`synthetic = 0`) `payment_captured` or `payment_failed` entry needs a `provider_event_id`, and every payment entry needs a `payment_id`. `provider_event` rows exist only with `signature_verified = 1`. `(provider_event_id, kind)` is unique, so a webhook delivered twice cannot apply twice. `(debtor, idempotency_key)` is unique on `settlement_payment`, so a retry cannot create a second payment.
5. **ADR 0007 states only.** `hangout.state` and `hangout_transition` accept exactly the 12 ADR 0007 states, the same list as `HangoutState` in the contract (a test compares them). Retired states such as `COMMITTING` are refused.
6. **Pods.** At most 8 joined members per pod (a trigger raises `pod_full`). Invite links are single use: once used or revoked, `used_by`/`used_at` cannot change. Only one pending invitation per (pod, invitee).
7. **Private stays private.** Private limits exist only as `private_limits_vault.sealed`, the AES-256-GCM record from the Constraint Vault; no column anywhere is named for a budget, diet, dislike or travel limit. `planner_chat_message` and `stretch_ask` have no pod column, so nothing private can be addressed to a pod. Calendar tables hold consent, a credential reference and write receipts, never event titles, attendees or locations. `paypal_link` holds the link only, never bank or card details.
8. **Honest labels.** `booking.simulated` and `shortlist_option.synthetic` must be 1. Subscription receipts must be `sandbox` at 1500 cents.
9. **Single-choice votes.** `poll_vote` has one row per (poll, member); changing a vote replaces it. Votes and ready answers are stored with the member, because the contract shows them with names (Q-013).

## Entities

| Area         | Tables                                                                                                                                                           | Notes                                                                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| People       | `app_user`, `user_interest`, `private_limits_vault`, `permission_status`, `phone_challenge`, `session`                                                           | `app_user.synthetic` marks seeded demo people. Codes and CSRF tokens are stored as digests only.                                                           |
| Pods         | `pod`, `pod_membership`, `pod_invitation`, `invite_link`, `rhythm_proposal`, `rhythm_acceptance`, `group_activity`                                               | The agreed rhythm and next date live on `pod`. Invite tokens are stored as digests. Leaving sets `left_at`; the row stays for history.                     |
| Chat         | `pod_message`, `planner_chat_message`                                                                                                                            | A pod message is text or a card reference, never both. `client_message_id` deduplicates resends.                                                           |
| Planning     | `hangout`, `hangout_transition`, `stretch_ask`, `shortlist_option`, `time_slot`, `poll`, `poll_option`, `poll_vote`, `ready_answer`, `booking`, `hangout_rating` | One activity poll and one time poll per hangout. A poll option is exactly one of an activity or a slot. `hangout.version` supports optimistic concurrency. |
| Money        | `split`, `split_actual_total`, `ledger_entry`, `settlement_payment`, `provider_event`, `idempotency_record`, `paypal_link`                                       | See the next section.                                                                                                                                      |
| Calendar     | `calendar_account`, `calendar_consent`, `calendar_write`                                                                                                         | `planner_may_read` defaults to 0: per-calendar consent is opt-in.                                                                                          |
| Subscription | `subscription_receipt`                                                                                                                                           | Append-only; plan status is derived from the newest unexpired receipt.                                                                                     |
| Hub          | `saved_event`, `notification_settings`, `push_token`                                                                                                             | `event_id` refers to the seeded catalog (US-010), which is fixture data, so it has no foreign key.                                                         |

## Money: the IOU ledger

`ledger_entry` is the only place money is recorded. Each row is signed integer cents that `debtor_user_id` owes `creditor_user_id` for one hangout.

| Kind                | Written when                                                   | Amount                    |
| ------------------- | -------------------------------------------------------------- | ------------------------- |
| `balance_created`   | The payer confirms the split (one row per yes-member who owes) | The member's share, > 0   |
| `adjustment`        | The payer enters the actual total and a share changes          | Signed difference         |
| `payment_initiated` | A member starts a PayPal payment (gate closed until US-006)    | The payment amount, > 0   |
| `payment_captured`  | A signature-verified webhook confirms it                       | The captured amount, > 0  |
| `payment_failed`    | A verified webhook reports failure                             | The attempted amount, > 0 |

The kind names match the US-005 IOU ledger (PR #51) plus `adjustment`, so the durable rows and the in-memory model describe the same events. **The derivation itself is US-005 (Alan):** balance status (`owed`, `pending`, `paid`, `failed`), the rotating-remainder split and 100% branch coverage live there. This schema only guarantees that the inputs are append-only, integer and provenance-checked.

`split` records what the payer confirmed (payer and estimate) and holds no balance. Each later final amount is a new `split_actual_total` row; the newest is current.

## Hangout lifecycle

`services/api/src/hangout-lifecycle.mjs` is the transition table. It follows the contract exactly, and the contract is the source of truth. `services/api/src/db/hangout-store.mjs` applies an event durably: one transaction checks `hangout.version`, computes the next state, updates the row and appends a `hangout_transition` (from, to, event, actor, time). The schema imports its state list from the lifecycle module, so the two cannot drift. The ADR 0006 `hangout.mjs` is retired and unchanged.

| From                    | Event                                                      | To                                           | Guard                                                             |
| ----------------------- | ---------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| (new)                   | `started`                                                  | `PLANNING`                                   | —                                                                 |
| `PLANNING`              | `stretchAsksSent` / `shortlistPosted` / `noOptionFits`     | `STRETCH_ASKS` / `ACTIVITY_VOTE` / `NO_PLAN` | —                                                                 |
| `STRETCH_ASKS`          | `stretchAsksResolved`                                      | `PLANNING`                                   | Answers and expiries stay private                                 |
| `ACTIVITY_VOTE`         | `activityChosen` / `activityPollClosedWithoutVotes`        | `TIME_VOTE` / `NO_PLAN`                      | —                                                                 |
| `TIME_VOTE`             | `timeChosen` / `timePollClosedWithoutVotes` / `noSlotFits` | `READY_CHECK` / `NO_PLAN`                    | —                                                                 |
| `READY_CHECK`           | `readyCheckClosedWithYes`                                  | `AWAITING_CONFIRMATION`                      | At least one yes; **any number is enough**                        |
| `READY_CHECK`           | `readyCheckClosedWithNoYes`                                | `NO_PLAN`                                    | Zero yeses; a single "no" is never an event                       |
| `AWAITING_CONFIRMATION` | `bookingConfirmed`                                         | `BOOKING`                                    | A payer has volunteered **and** the actor is that payer (Q-011.6) |
| `BOOKING`               | `bookingSucceeded` / `bookingFailed`                       | `BOOKED` / `BOOKING_FAILED`                  | The booking is simulated                                          |
| `BOOKED`                | `splitConfirmed`                                           | `BALANCES_OPEN`                              | The actor is the payer                                            |
| `BALANCES_OPEN`         | `allBalancesPaid`                                          | `SETTLED`                                    | —                                                                 |
| `NO_PLAN`               | `plannerOfferAccepted`                                     | `PLANNING`                                   | Offer is `widen_window`, `widen_area` or `next_best`              |
| `BOOKING_FAILED`        | `plannerOfferAccepted`                                     | `PLANNING`                                   | Offer is `next_best`                                              |

`SETTLED` is the only terminal state. `NO_PLAN` and `BOOKING_FAILED` are resting states: the planner offers a way back, and a new hangout may start in the pod. The Home cue (`PodStage`) is derived from the state alone and never describes a single member. A refused event carries the contract error code (`wrong_hangout_state` or `not_payer`).

**Not modelled, because the spec leaves them open:** the payer dropping out after booking (decision 19) and a pod falling below three members (decision 11).

## Concurrency and idempotency

- Every migration runs in its own `BEGIN IMMEDIATE` transaction with its `schema_migration` row; a failure rolls back the whole migration.
- Routes that change a hangout re-read `hangout.version` inside the write transaction and bump it, so two concurrent confirmations cannot both succeed.
- `idempotency_record` stores `(actor, operation, key)` with the target, a body digest and the first response, matching the contract's idempotency rule; it is append-only.

## Migration plan

1. Migration 1 creates the core schema. It is applied with `migrate(db)` and tested on a scratch file in the system temp directory: apply, reopen, re-run as a no-op, `integrity_check` and `foreign_key_check`.
2. Migration 2 (US-008) adds `ready_check` (one per hangout, with its closing time) and `reminder_sent` (append-only; one row per (kind, reference, member), so a reminder job never sends the same private reminder twice).
3. Migration 3 (US-012) rebuilds `reminder_sent` to add the `booking_confirmation_needed` kind. SQLite cannot alter a CHECK, so the rows are copied into a new table and the append-only triggers are recreated.
4. **Never edit a shipped migration.** Add the next version; versions must be 1, 2, 3 … with no gaps, and a database newer than the code refuses to open.
5. Seeding synthetic demo data into this schema is US-301 / `infra/seed`, not this task.
