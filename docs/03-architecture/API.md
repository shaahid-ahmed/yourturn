# YourTurn API contract

**Status:** `v0.1.0-draft` — draft for YT-009. **Not frozen, not implemented, not approved for money movement.** Freeze is YT-014 and requires the Q-001/Q-002/Q-006 decisions. Machine-readable source of truth: [openapi.json](openapi.json). Rationale: [ADR 0004](../decisions/0004-phase-1-contracts.md).
**Owner:** Architect. LLM Engineer owns the prompts section of [AI.md](AI.md); Payments owns [PAYMENTS.md](PAYMENTS.md).

## Contract status and version

| Property             | Value                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| Contract version     | `0.1.0-draft` (`info.version` in openapi.json)                                                     |
| Status marker        | `info.x-contract-status: draft`, `info.x-frozen: false`                                            |
| Base path            | `/api/v1` on loopback only; no sandbox or production server is declared                            |
| Media type           | `application/json; charset=utf-8` for all requests and responses                                   |
| Breaking-change rule | Any route, schema, money-semantics or graph-boundary change needs a new ADR and Architect approval |

While the status is `draft`, no role may treat these routes as settled: Backend and Frontend may build against them only after the YT-014 freeze and only for the behaviors whose policy decisions have landed. Payment-executing routes additionally require human money-flow approval.

## Authentication and authorization

**Session model.** `POST /sessions` selects a seeded synthetic member; there is no password, email or real identity. The server sets an `HttpOnly`, `SameSite=Strict` session cookie (`Secure` whenever served over TLS) and returns a CSRF token.

**CSRF.** Every mutating request (`POST`, `PUT`, `DELETE`) must send `X-CSRF-Token` matching the session's token. A missing or wrong token yields `403 csrf_rejected` with no state change.

**Tenant isolation.** Authorization is evaluated per circle on every request, from the session's membership rows — never from a client-supplied member or circle claim. A caller who is not an accepted member of the circle in the path receives `404 not_found`, identical to a non-existent circle, so existence, size and member names are not disclosed.

**Authorization matrix.**

| Operation                                                                           | Permitted caller                                                      | Denied-caller behavior                                 |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| `getCircle`, `listTurns`, `getLedger`, `listContributionProposals`                  | Accepted or paused member of that circle                              | `404`                                                  |
| `acceptInvitation`                                                                  | Invitee named on that invitation                                      | `404` for anyone else                                  |
| `createContributionProposal`, `agreeContributionProposal`                           | Accepted member; agreement records only the caller's own              | `404` / `403`                                          |
| `setOwnTrackingConsent`, `pauseOwnParticipation`, `leaveCircle`, `setOwnAttendance` | The member themselves (`/members/me`) only — no admin override exists | `404`                                                  |
| `createPlanSuggestions`, `approvePlan`, `createVenuePayment`                        | Host of that specific turn                                            | `403 not_host`, with no host-only guidance in the body |
| `getSyntheticDemoGraph`                                                             | Any authenticated session                                             | `401`                                                  |
| `receiveProviderWebhook`                                                            | Unauthenticated by provider design; gated by signature verification   | `401 webhook_signature_invalid`, no side effects       |

**Host-only data.** Reconnection guidance is returned only to the current host, only as positive plan framing, and never as a numeric value, ranking or warning about named people. No endpoint exposes another member's consent state, pause state, contact details or tie value — including through error messages and validation details.

## Routes and schemas

Full schemas are in `openapi.json`. Summary, grouped by tag:

| Method and path                                                  | Operation                   | Notes                                            |
| ---------------------------------------------------------------- | --------------------------- | ------------------------------------------------ |
| `POST /sessions`                                                 | `createSession`             | Demo identity only; returns CSRF token           |
| `DELETE /sessions`                                               | `endSession`                | Clears session                                   |
| `GET /me`                                                        | `getCurrentMember`          | Caller's own record and memberships              |
| `GET /venues`                                                    | `listVenues`                | Fixed list; `availabilityKnown: false`           |
| `GET /circles/{circleId}`                                        | `getCircle`                 | Peer view, `potCentsDerived`, `readyForPlanning` |
| `POST /circles/{circleId}/invitations/{invitationId}/acceptance` | `acceptInvitation`          | `409 circle_full` above six accepted             |
| `GET`/`POST /circles/{circleId}/contribution-proposals`          | proposal read/create        | Amount 100–1500 cents, default 500               |
| `POST …/contribution-proposals/{proposalId}/agreements`          | `agreeContributionProposal` | Version-bound; `409 version_stale`               |
| `PUT /circles/{circleId}/members/me/consent`                     | `setOwnTrackingConsent`     | Default off; withdrawal excludes incident edges  |
| `POST …/members/me/pause`                                        | `pauseOwnParticipation`     | **No reason field exists**                       |
| `POST …/members/me/leave`                                        | `leaveCircle`               | One confirmation; no retention offer             |
| `GET /circles/{circleId}/turns`                                  | `listTurns`                 | Deterministic order + advancement state          |
| `POST …/turns/{turnId}/plan-suggestions`                         | `createPlanSuggestions`     | Exactly three plans or explicit unavailable      |
| `POST …/turns/{turnId}/approvals`                                | `approvePlan`               | Records exact plan version; not a payment        |
| `PUT …/turns/{turnId}/attendance`                                | `setOwnAttendance`          | `penaltyApplied: false` always                   |
| `GET /circles/{circleId}/ledger`                                 | `getLedger`                 | Derived pot + append-only entries                |
| `GET`/`POST /circles/{circleId}/subscriptions`                   | subscription state/start    | Start is gate-blocked                            |
| `GET`/`POST …/turns/{turnId}/venue-payments`                     | payment state/create        | Create is gate-blocked                           |
| `POST /webhooks/paypal`                                          | `receiveProviderWebhook`    | Verify signature before any effect               |
| `GET /demo/graph`                                                | `getSyntheticDemoGraph`     | Only numeric-edge endpoint; synthetic fixture    |

### Invariants the schema enforces

1. **Money.** Every monetary field is `integer` and named `*Cents`; `currency` is `const: "USD"`. Contribution amounts are bounded 100–1500 inclusive (floor is draft proposal D-P01, ceiling is from the brief). No float, decimal string or formatted amount appears anywhere.
2. **Derived pot.** Responses expose `potCentsDerived` with `derivedFromEntryCount`. No schema has a writable or stored balance field.
3. **Exactly three.** `SuggestionSet.plans` is `minItems: 3, maxItems: 3`, and `oneOf` forbids carrying `plans` and `unavailableReason` together, so a degraded result cannot look like success.
4. **Approval is not payment.** `PlanApproval` carries `isPayment: false` and `isReservation: false` as constants; `PaymentState` carries `reservationConfirmed: false` and `attendanceConfirmed: false`.
5. **Synthetic graph only.** `SyntheticGraph.synthetic` is `const: true`, node ids must match `^synthetic-`, and every edge carries a `textEquivalent` alongside `stateLabel`. No other response schema contains a numeric tie value. The data source is the route, not a request flag.
6. **No hardship reasons.** `PauseRequest` has `additionalProperties: false` and no reason field, so there is no wire format in which a reason could arrive.
7. **Honest pending states.** `ConsentState.ownDataAccess`, `ParticipationState.collectionEffect` and `LeaveResult.forfeitPolicy` are enums whose only value names the unresolved decision, instead of asserting a settled outcome.
8. **Distinct provider states.** Subscription (`created`/`approved`/`active`/`payment_received`) and payment (`order_created`/`payer_approved`/`captured`) states are separate enum members; `blocked` and `failed` are distinct from both.

## Errors and idempotency

**Error shape.** Every non-2xx response is `Error`: a stable `code` from a closed enum, a human `message`, optional field-level `details`, and optional `pendingDecision` naming the open question that blocks the operation. Error bodies never include another member's data, a hardship reason or a tie score.

| Status | Codes                                                                                             | Meaning                                                             |
| ------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 400    | `validation_failed`                                                                               | Schema or bounds violation; nothing changed                         |
| 401    | `unauthenticated`, `webhook_signature_invalid`                                                    | No valid session; or unverified provider event with no side effects |
| 403    | `csrf_rejected`, `not_host`                                                                       | Rejected without leaking host-only data                             |
| 404    | `not_found`                                                                                       | Missing **or** not a member — deliberately indistinguishable        |
| 409    | `circle_full`, `circle_not_ready`, `version_stale`, `invitation_resolved`, `payment_gate_blocked` | Conflict with current state or a closed gate                        |
| 422    | `approval_stale`, `budget_exceeded`                                                               | Request understood but refused on money-safety grounds              |
| 429    | `rate_limited`                                                                                    | Abuse protection                                                    |
| 500    | `internal_error`                                                                                  | No partial money effect may persist                                 |

**Payment gate.** `payment_gate_blocked` returns a `gate` object with `open: false`, `humanApprovalRecorded: false` and the blocking task ids. The gate is server-side configuration; no request field, header, query parameter or client state can open it, and the contract defines **no** simulated-success response.

**Idempotency (internal).** Mutating requests accept `Idempotency-Key`. The server persists `(actor, operation, key) → first response` and replays the stored response on retry, so a retried accept, agreement, approval or payment attempt cannot double-apply. Keys are per logical operation: a different operation with a reused key is rejected rather than replayed.

**Idempotency (provider).** RULES rule 8 requires an idempotency key on every PayPal call; endpoint-specific provider support and retention are **unverified (Q-005)**. The contract therefore relies on internal keys plus provider-event deduplication by `providerEventId`, and does not assume that sending a header guarantees provider-side deduplication.

**Webhook safety.** Signature verification precedes any ledger entry, status change or notification. Verified events are deduplicated by provider event id; a duplicate returns `202` with `duplicate: true, effectsApplied: false` and leaves the derived pot unchanged. Out-of-order events are reconciled by reading provider state rather than by trusting arrival order.

## Machine-readable schema and shared type generation

`openapi.json` is the single source of truth. After the YT-014 freeze, `packages/shared` will contain types generated from it by a committed script, and no role may hand-write a duplicate of a generated type. Until then, `packages/shared` holds no types — the contract is still moving.

Generation plan: `openapi.json` → generator → `packages/shared/src/contract.d.ts` (types only, no runtime logic), verified by regenerating in CI and failing on any diff, so drift between the contract and the code cannot pass review.

## Contract tests

Implemented now (`tests/contract.test.mjs`, run by `npm test`) against the committed spec, with no network access:

- spec parses as JSON, declares `openapi: 3.1.0`, and is marked `draft` / not frozen;
- every path item has at least one operation, every operation has a unique `operationId`, a `summary` and at least one response, and every `$ref` resolves within the document;
- every monetary schema is `integer`; contribution bounds are exactly 100–1500; `currency` is `const: "USD"`;
- `SuggestionSet.plans` is fixed at exactly three items;
- `PlanApproval.isPayment` / `isReservation` and `PaymentState.reservationConfirmed` / `attendanceConfirmed` are `false` constants;
- `SyntheticGraph.synthetic` is `const: true` and no other schema exposes a numeric tie value;
- `PauseRequest` admits no reason field;
- both payment-executing operations document a `409` with the `payment_gate_blocked` gate shape.

These are **structural** checks against the document. Validation against the full OpenAPI 3.1 metaschema, request/response validation of a running service, and product end-to-end tests are future work (QA, YT-028); passing these tests is not evidence that any endpoint exists.
