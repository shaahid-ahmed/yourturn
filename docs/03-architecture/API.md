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
| `createManualPlan`                                                                  | Host of that turn                                                     | `403 not_host`                                         |
| `getSyntheticDemoGraph`                                                             | Any authenticated session                                             | `401`                                                  |
| `createSession`, `endSession`, `getCurrentMember`, `listVenues`                     | Any caller / own session                                              | `401` where a session is required                      |
| `getOwnSubscriptionState`, `startContributionSubscription`                          | The member themselves                                                 | `404`                                                  |
| `getVenuePaymentState`                                                              | Any accepted or paused member of that circle                          | `404`                                                  |
| `receiveProviderWebhook`                                                            | Unauthenticated by provider design; gated by signature verification   | `401 webhook_signature_invalid`, no side effects       |

**Post-exit access is undecided (XR-15).** A departed member currently receives `404` on circle-scoped routes, which also hides their own pending subscription or payment state. Whether a former member may read their own money state — scoped so no other member's data is exposed — is a Q-006 question; no route is added until it is decided.

**Two closed gates.** _Payments_ are gated on YT-006 evidence, the YT-025 legal assessment, a Q-006 decision and human money-flow approval (XR-06). _Real-member graph inference_ is gated on Q-002 (XR-01): while closed, no tie- or drift-derived value is computed, stored, returned **or used as prompt input**, and no guidance names a pair. Non-persistence was never the safeguard — not inferring is. Both gates are server-side configuration that only a human can open; neither has a simulated-success path.

**Host-only data.** Host-facing copy comes from a closed `rationaleKey` vocabulary chosen by the server, never from model prose (XR-02), so "positive framing" is a checkable constraint rather than a hope. No numeric value, ranking or warning about named people is ever returned. No endpoint exposes another member's consent state, pause state, contact details or tie value — including through error messages and validation details.

## Routes and schemas

Full schemas are in `openapi.json`. Summary, grouped by tag:

| Method and path                                                  | Operation                   | Notes                                                   |
| ---------------------------------------------------------------- | --------------------------- | ------------------------------------------------------- |
| `POST /sessions`                                                 | `createSession`             | Demo identity only; returns CSRF token                  |
| `DELETE /sessions`                                               | `endSession`                | Clears session                                          |
| `GET /me`                                                        | `getCurrentMember`          | Caller's own record and memberships                     |
| `GET /venues`                                                    | `listVenues`                | Fixed list; `availabilityKnown: false`                  |
| `GET /circles/{circleId}`                                        | `getCircle`                 | Peer view, `potCentsDerived`, `readyForPlanning`        |
| `POST /circles/{circleId}/invitations/{invitationId}/acceptance` | `acceptInvitation`          | `409 circle_full` above six accepted                    |
| `GET`/`POST /circles/{circleId}/contribution-proposals`          | proposal read/create        | Amount 100–1500 cents, default 500                      |
| `POST …/contribution-proposals/{proposalId}/agreements`          | `agreeContributionProposal` | Version-bound; `409 version_stale`                      |
| `PUT /circles/{circleId}/members/me/consent`                     | `setOwnTrackingConsent`     | Default off; withdrawal excludes incident edges         |
| `POST …/members/me/pause`                                        | `pauseOwnParticipation`     | **No reason field exists**                              |
| `POST …/members/me/leave`                                        | `leaveCircle`               | One confirmation; no retention offer                    |
| `GET /circles/{circleId}/turns`                                  | `listTurns`                 | Deterministic order + advancement state                 |
| `POST …/turns/{turnId}/plan-suggestions`                         | `createPlanSuggestions`     | Exactly three plans or explicit unavailable             |
| `POST …/turns/{turnId}/approvals`                                | `approvePlan`               | Records exact plan version; not a payment               |
| `PUT …/turns/{turnId}/attendance`                                | `setOwnAttendance`          | `penaltyApplied: false` always                          |
| `GET /circles/{circleId}/ledger`                                 | `getLedger`                 | Derived pot + append-only entries                       |
| `GET`/`POST /circles/{circleId}/subscriptions`                   | subscription state/start    | Start is gate-blocked                                   |
| `POST …/turns/{turnId}/plans`                                    | `createManualPlan`          | Non-AI fixed-venue path (XR-11)                         |
| `GET`/`POST …/turns/{turnId}/venue-payments`                     | payment state/create        | Payouts from the pot (ADR 0005); create is gate-blocked |
| `POST /webhooks/paypal`                                          | `receiveProviderWebhook`    | Verify signature before any effect                      |
| `GET /demo/graph`                                                | `getSyntheticDemoGraph`     | Only numeric-edge endpoint; synthetic fixture           |

### Invariants the schema enforces

1. **Money.** Every monetary field is `integer` and named `*Cents`; `currency` is `const: "USD"`. Contribution amounts are bounded 100–1500 inclusive (floor is draft proposal D-P01, ceiling is from the brief). No float, decimal string or formatted amount appears anywhere.
2. **Derived pot, split by provenance.** `potCentsDerived` (all entries, display only) and `potCentsVerified` (synthetic-free, provider-verified) are separate signed sums; **only `potCentsVerified` may gate a payment**, so fixture money cannot authorize a real one (XR-03). Both are signed because an out-of-order outflow or a correction can make the pot negative, which is shown as a deficit rather than clamped (XR-05). `potLabel` is required wherever a pot appears. No schema has a writable or stored balance field.
3. **Exactly three, distinct.** `SuggestionSet.plans` is `minItems: 3, maxItems: 3, uniqueItems: true` with a distinct venue per plan, and each `oneOf` branch pins `outcome` to a `const`, so `outcome: "three_plans"` cannot accompany an unavailable result (XR-26). A degraded result cannot look like success.
4. **Approval is not payment.** `PlanApproval` carries `isPayment: false` and `isReservation: false` as constants; `PaymentState` carries `reservationConfirmed: false` and `attendanceConfirmed: false`.
5. **Synthetic graph only.** `SyntheticGraph.synthetic` is `const: true`, node ids must match `^synthetic-`, and every edge carries a `textEquivalent` alongside `stateLabel`. No other response schema contains a numeric tie value. The data source is the route, not a request flag.
6. **No hardship reasons.** `PauseRequest` has `additionalProperties: false` and no reason field, so there is no wire format in which a reason could arrive.
7. **Honest pending states.** `ConsentState.ownDataAccess`, `ParticipationState.collectionEffect` and `LeaveResult.forfeitPolicy` are enums whose only value names the unresolved decision, instead of asserting a settled outcome.
8. **Distinct provider states.** Subscription (`created`/`approved`/`active`/`payment_received`) and payout (`payout_pending`/`payout_success`/`payout_denied`) states are separate enum members; `blocked` and `failed` are distinct from both. `payout_pending` is what a create returns, so it is never displayed as success.
9. **Fees are explicit.** `PaymentState.feeCents` is required and `LedgerEntry.kind` includes `provider_fee`: one payout writes a venue-amount entry and a fee entry, both keyed to one verified event, so the derived pot cannot drift from the real balance (ADR 0005).

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
| 429    | `rate_limited`                                                                                    | Abuse protection; now declared on every operation (XR-27)           |
| 500    | `internal_error`                                                                                  | No partial money effect may persist; declared on every operation    |
| 503    | `graph_gate_blocked`                                                                              | Real-member graph inference is gated closed (Q-002)                 |

**Payment gate.** `payment_gate_blocked` returns a `gate` object with `open: false`, `humanApprovalRecorded: false` and the blocking task ids. The gate is server-side configuration; no request field, header, query parameter or client state can open it, and the contract defines **no** simulated-success response.

**Idempotency (internal).** Mutating requests accept `Idempotency-Key`. The server persists `(actor, operation, key) → first response` **plus the path parameters and a request-body fingerprint**, and replays the stored response only when all three match (XR-21). A reused key with a different target or body returns `409 idempotency_key_conflict` rather than replaying the wrong result — otherwise the same key on circle B would return circle A's success and silently fail to act.

**Idempotency (provider).** RULES rule 8 requires an idempotency key on every PayPal call; endpoint-specific provider support and retention are **unverified (Q-005)**. The contract therefore relies on internal keys plus provider-event deduplication by `providerEventId`, and does not assume that sending a header guarantees provider-side deduplication.

**Webhook safety.** Signature verification precedes any ledger entry, status change or notification. Verified events are deduplicated by provider event id; a duplicate returns `202` with `duplicate: true, effectsApplied: false` and leaves the derived pot unchanged. Out-of-order events are reconciled by reading provider state rather than by trusting arrival order.

## Machine-readable schema and shared type generation

`openapi.json` is the single source of truth. After the YT-014 freeze, `packages/shared` will contain types generated from it by a committed script, and no role may hand-write a duplicate of a generated type. Until then, `packages/shared` holds no types — the contract is still moving.

Generation plan: `openapi.json` → generator → `packages/shared/src/contract.d.ts` (types only, no runtime logic), verified by regenerating in CI and failing on any diff, so drift between the contract and the code cannot pass review.

## Contract tests

**Known verification gaps, stated plainly (XR-27):** the spec has **24 operations** — earlier handoffs said 21, which was wrong. Validation against the full OpenAPI 3.1 **metaschema has not been run**, so ADR 0004's verification step is unmet rather than satisfied. The contribution floor of 100 cents is a **draft proposal (D-P01)**, so tests assert that a floor exists and is documented as draft, not that it is 100.

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
