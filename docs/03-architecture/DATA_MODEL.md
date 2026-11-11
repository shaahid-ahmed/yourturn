# YourTurn data model

**Status:** `v0.1.0-draft` for YT-009; **not a frozen schema, not migrated, not implemented.** Freeze is YT-014. Contract: [API.md](API.md) and [openapi.json](openapi.json). Rationale: [ADR 0004](../decisions/0004-phase-1-contracts.md).
**Owner:** Architect. Money semantics are shared with Payments ([PAYMENTS.md](PAYMENTS.md)); consent semantics with Privacy.

Target engine for the demo is SQLite (ADR 0002). Types below are written for SQLite with strict-typed columns; a later Postgres migration would use the same constraints.

## Entities

| Table                    | Purpose                                | Key columns                                                                                                                          |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `member`                 | A person in the demo                   | `member_id` PK (ULID), `first_name`, `created_at`                                                                                    |
| `circle`                 | A friend group                         | `circle_id` PK, `name`, `membership_version`, `created_at`                                                                           |
| `membership`             | Person ↔ circle, with lifecycle state  | PK `(circle_id, member_id)`, `state`, `accepted_at`, `left_at`, `member_seq`                                                         |
| `invitation`             | Pending invite to a named person       | `invitation_id` PK, `circle_id`, `invitee_member_id`, `state`                                                                        |
| `contribution_proposal`  | A proposed monthly amount              | `proposal_id` PK, `circle_id`, `amount_cents`, `proposal_version`, `membership_version`, `state`                                     |
| `contribution_agreement` | One member's explicit agreement        | PK `(proposal_id, member_id)`, `amount_cents`, `membership_version`, `agreed_at`                                                     |
| `tracking_consent`       | Own graph-tracking choice              | PK `(circle_id, member_id)`, `tracking_enabled`, `updated_at`                                                                        |
| `participation_pause`    | Self-service pause                     | PK `(circle_id, member_id, started_at)`, `ended_at` — **no reason column**                                                           |
| `turn`                   | One hosting turn                       | `turn_id` PK, `circle_id`, `cycle_index`, `sequence`, `host_member_id`, `state`                                                      |
| `venue`                  | Fixed demo venue                       | `venue_id` PK, `name`, `category`, `estimated_cost_cents`                                                                            |
| `plan`                   | An immutable suggested or manual plan  | PK `(plan_id, plan_version)`, `turn_id`, `venue_id`, `title`, `total_cents`, `source`                                                |
| `suggestion_set`         | One generation attempt and its outcome | `suggestion_set_id` PK, `turn_id`, `outcome`, `retries_used`, `created_at`                                                           |
| `plan_approval`          | Host's deterministic approval snapshot | `approval_id` PK, `turn_id`, `host_member_id`, `plan_id`, `plan_version`, `venue_id`, `total_cents`, `approved_at`, `invalidated_at` |
| `attendance`             | Own RSVP / check-in                    | PK `(turn_id, member_id)`, `response`, `checked_in`, `updated_at`                                                                    |
| `ledger_entry`           | Append-only money record               | `entry_id` PK, `circle_id`, `kind`, `amount_cents`, `occurred_at`, `provider_event_id` UNIQUE NULLABLE, `synthetic`                  |
| `provider_event`         | Signature-verified provider event      | `provider_event_id` PK, `event_type`, `verified_at`, `payload_digest`                                                                |
| `payment_attempt`        | Subscription/order attempt state       | `attempt_id` PK, `circle_id`, `turn_id` NULLABLE, `member_id` NULLABLE, `kind`, `state`, `amount_cents`, `provider_ref` NULLABLE     |
| `idempotency_record`     | Replay store for mutating calls        | PK `(actor_member_id, operation, idempotency_key)`, `response_digest`, `response_body`, `created_at`                                 |

**Deliberate omissions.** There is no `pot_balance` column, no `pause_reason` column, no `tie_score` column on any real-member table, no stored `drift_flag`, and no `email`/`phone`/`payment_instrument` column. Each omission is a safeguard: a column that does not exist cannot leak, drift out of sync, or be displayed by accident.

**Real-member graph data.** Interaction signals live in `attendance` plus derived in-memory computation. Tie values for real members are computed transiently for host guidance and are never persisted, never returned numerically, and never exported. The demo graph's numbers come from a separate versioned fixture file, not from any table.

## Money, integer cents and the append-only ledger

- Every monetary column is `INTEGER NOT NULL` in whole USD cents, suffixed `_cents`. Currency is implicitly `USD` and recorded in the contract as a constant; no float, decimal or string amount exists anywhere in the schema.
- `CHECK (amount_cents BETWEEN 100 AND 1500)` on `contribution_proposal` and `contribution_agreement` (floor is draft proposal D-P01, ceiling is from the brief).
- `CHECK (total_cents >= 0)` on `plan` and `plan_approval`.
- `ledger_entry.amount_cents` is **signed**: contributions positive, venue payments negative. `CHECK (amount_cents <> 0)`.
- **Append-only:** no `UPDATE` or `DELETE` on `ledger_entry` is permitted; a correction is a new `kind = 'correction'` row referencing the original in `corrects_entry_id`. Enforced by triggers that raise on update/delete, so the rule survives a careless query.
- **Derived pot:** `SELECT COALESCE(SUM(amount_cents), 0) FROM ledger_entry WHERE circle_id = ?`. Never cached in a writable column. `derivedFromEntryCount` accompanies every response so a reader can tell the sum is a derivation.
- `ledger_entry.provider_event_id` is nullable and unique **together with `kind`** (`UNIQUE (provider_event_id, kind)`): a verified provider event creates at most one entry per kind, which is the database-level guarantee behind replay safety. A venue payout legitimately produces two entries from one event — `venue_payment_sent` and `provider_fee` (ADR 0005, 0.25 USD observed on a 12.00 USD payout) — and a replay of that event can add neither. Rows with `synthetic = 1` always have `provider_event_id IS NULL` — fixture data can never masquerade as provider evidence.
- No ledger row may be written from an unverified webhook: `provider_event_id` is a foreign key to `provider_event`, and rows only land in `provider_event` after signature verification.

## Rotation and membership invariants

1. **Size.** At most six `membership` rows per circle with `state = 'accepted'`, enforced by an insert/update trigger. `readyForPlanning` additionally requires at least three.
2. **Deterministic order.** Rotation sorts by `membership.member_seq` (monotonic per circle, assigned on acceptance) then `member_id` as an immutable tie-break. No closeness, attendance or payment column participates in the ordering — expressible as a test that the ordering query references only those two columns.
3. **One turn per cycle.** `UNIQUE (circle_id, cycle_index, host_member_id)` and `UNIQUE (circle_id, cycle_index, sequence)`: within a cycle a member hosts at most once and each slot is held once.
4. **History is immutable.** Completed turns are never rewritten when membership changes; the new membership takes effect from the next cycle.
5. **Interrupted cycles.** On pause, leave or join mid-cycle, affected future turns move to `state = 'suspended'` and advancement reports `suspended_pending_rule`. The reassignment rule is **undecided (PRD D-P02)**; the schema records the suspension rather than inventing an order.
6. **Exit is never blocked.** A `membership` row may always reach `state = 'left'`, including for the current host. No invariant above may be used to refuse a departure.
7. **Advance is explicit.** Turn advancement is a recorded demo-operator action; no scheduler or clock trigger advances a turn or triggers collection.
8. **Membership version.** Any accepted-membership change increments `circle.membership_version`, which invalidates contribution agreements bound to the old version (`contribution_proposal.state = 'invalidated'`) without deleting their history.

## Consent and deletion

- `tracking_consent` defaults to **absent/disabled**: no row, or `tracking_enabled = 0`, means tracking off. Consent is never implied by membership acceptance or contribution agreement.
- Withdrawal sets `tracking_enabled = 0` with a new `updated_at`. Every graph computation filters out **all** pairs containing a member whose tracking is off, so an edge cannot be reconstructed from the counterpart's retained `attendance` rows.
- Any cached or materialized graph artifact is keyed by `(circle_id, max(tracking_consent.updated_at), fixture_revision)`, so a consent change invalidates it before reuse rather than serving a stale edge.
- Declining tracking changes nothing else: invitations, turns, plans and attendance are unaffected, and no table records a penalty.
- **Unresolved (Q-006):** whether a member may read their own derived interaction data without exposing a counterpart's data, and what retention or deletion applies to `attendance` history after withdrawal. The schema therefore keeps `attendance` minimal (response, check-in flag, timestamp) and adds no inference columns until the decision lands.
- Prompt inputs are assembled from first names and plan-relevant preferences only. No query that builds a prompt may select an email column (none exists), a payment column, a pause row or a tie value.

## Concurrency and idempotency

- **Transaction boundaries.** One transaction per logical operation: accepting an invitation (size check + membership insert + version bump); recording an agreement (version re-check + agreement insert + possible proposal transition); approving a plan (host re-check + budget re-derivation + approval insert); applying a verified provider event (`provider_event` insert + at most one `ledger_entry` insert).
- **Serialized writes.** SQLite runs in WAL mode with `IMMEDIATE` transactions for these writes, so the size, agreement-completeness and budget checks cannot interleave with a competing write. The checks are re-evaluated **inside** the transaction, never from a value read earlier in the request.
- **Idempotency.** `idempotency_record` stores the first response per `(actor, operation, key)`; a retry replays it. Reusing a key for a different operation is rejected rather than replayed. The uniqueness is a primary key, so two concurrent retries cannot both proceed.
- **Provider replay.** `ledger_entry.provider_event_id UNIQUE` plus `provider_event` primary key mean a duplicate delivery hits a constraint and results in `duplicate: true, effectsApplied: false`.
- **Stale approvals.** `plan_approval` stores the full snapshot (plan id, plan version, venue, total). Execution re-compares the snapshot and refuses on mismatch (`approval_stale`); `invalidated_at` records supersession without deleting the record.
- **Budget race.** The derived pot is re-summed inside the approving transaction, so two concurrent approvals cannot both pass a budget check against the same stale total.

## Migration plan

- Migrations are forward-only numbered SQL files under `services/api/migrations/`, applied in order and recorded in a `schema_migration` table. No migration edits an existing migration file.
- `0001_initial.sql` would create every table above with its constraints and the ledger-immutability triggers; it does **not** exist yet, because the schema is not frozen.
- Seed data is separate from migrations: fixtures live in `tests/fixtures/` (Data, YT-018) and are loaded by `make seed` into an ignored local database, clearly marked `synthetic = 1`.
- Any column affecting money, consent or rotation requires a new ADR before its migration. Dropping a column that held money or consent history requires an explicit retention decision (Q-006) first.
- No production database, backup, restore or multi-tenant deployment is in scope; `docs/06-ops/ENVIRONMENTS.md` holds the environment boundary.
