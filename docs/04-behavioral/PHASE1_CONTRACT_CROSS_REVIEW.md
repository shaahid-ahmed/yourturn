# Phase 1 contract cross-review (Lane A → Lane S)

**Status:** Review comments for board row RV-001 (touchpoint T4). **Verdict: request changes.** Not an approval of any document, not a contract freeze, not behavioral sign-off, and not a substitute for the Reviewer gate that the human waived for the Phase 1 merge.
**Reviewer:** reviewer, kiro-lane-a-xr1 (Human: Alan). Date: November 11, 2026. Branch `reviewer/phase1-contract-review`, based on `main` @ `3a4d3ca`. Local only; nothing pushed.
**Independence:** the reviewer authored none of the reviewed files. The Lane A baselines used here (USER_STORIES, PHASE1_REVIEW) were also not written by this reviewer; where a finding exposes a problem in a Lane A baseline it is filed to a Lane A owner, not fixed here.

## Scope

Reviewed (Lane S, Architect, YT-009), read-only, no edits:

- `docs/03-architecture/API.md`
- `docs/03-architecture/openapi.json` (`0.1.0-draft`)
- `docs/03-architecture/DATA_MODEL.md`
- `docs/03-architecture/ARCHITECTURE.md`
- `docs/decisions/0004-phase-1-contracts.md`

Measured against: `docs/01-product/USER_STORIES.md` (US-001 to US-014), `docs/04-behavioral/PHASE1_REVIEW.md` (rules 1 to 8, checks B-01 to B-14), with `docs/00-context/*`, `PRD.md` and `agents/RULES.md` as constraints.

Not reviewed: `PAYMENTS.md`, `AI.md`, `packages/shared/README.md`, `tests/contract.test.mjs` beyond what it asserts about the spec. No implementation exists, so every finding is about the documents. No test was run against a service.

## Severity

- **Freeze blocker:** must be resolved, or explicitly deferred by ADR with the affected behavior gated closed, before YT-014.
- **Major:** a contradiction or missing criterion that would let an implementation pass the contract while violating a story or a B-check.
- **Minor:** accuracy or consistency; fix before freeze if cheap.

## Summary

| ID    | Severity       | Topic                                                                         | Stories / checks             | Board row |
| ----- | -------------- | ----------------------------------------------------------------------------- | ---------------------------- | --------- |
| XR-01 | Freeze blocker | Real-member inference designed in while Q-002 is open                         | US-012; rule 1; PHASE1 "not" | RV-002    |
| XR-02 | Freeze blocker | Host guidance travels in unconstrained LLM free text                          | US-009, US-012; B-07         | RV-002    |
| XR-03 | Freeze blocker | Synthetic ledger entries count toward the budget that gates payments          | US-004, US-011               | RV-003    |
| XR-04 | Freeze blocker | Non-synthetic ledger rows can exist without verified provenance               | US-011; RULES 9, 10          | RV-003    |
| XR-05 | Freeze blocker | `potCentsDerived` has minimum 0 but the signed sum can be negative            | US-004                       | RV-003    |
| XR-06 | Freeze blocker | Payment-gate preconditions omit Q-006                                         | US-005; rule 7               | RV-004    |
| XR-07 | Freeze blocker | Paused members break the size cap, agreement completion and version semantics | US-001, US-002, US-005       | RV-005    |
| XR-08 | Major          | Peer view exposes `paused`, pre-deciding Q-006                                | US-005; rule 1, 7            | RV-005    |
| XR-09 | Major          | Aggregate counts contradict US-002 and identify dissent in small circles      | US-002, US-005; B-03         | RV-008    |
| XR-10 | Major          | Stale-approval triggers are incomplete; status codes disagree                 | US-003, US-006, US-010       | RV-005    |
| XR-11 | Major          | Manual non-AI plan path has no operation                                      | US-009; D-P03                | RV-006    |
| XR-12 | Major          | Budget is client-supplied; plan price is not tied to the venue                | US-009                       | RV-006    |
| XR-13 | Major          | Free-text prompt inputs have no enforcement                                   | US-009; B-07; RULES 12       | RV-006    |
| XR-14 | Major          | No pending/unverified payment state                                           | US-011                       | RV-006    |
| XR-15 | Major          | Former members lose access to their own money state; matrix incomplete        | US-006; Q-006                | RV-006    |
| XR-16 | Major          | Consent applies retroactively to pre-consent history                          | US-007; rule 6               | RV-009    |
| XR-17 | Major          | Withdrawal does not invalidate persisted plans or suggestion sets             | US-008; B-05                 | RV-009    |
| XR-18 | Major          | Not-ready refusal exists only on suggestions                                  | US-001                       | RV-005    |
| XR-19 | Major          | Operator advance/reset, invitation decline and circle setup have no operation | US-003; PRD journeys         | RV-006    |
| XR-20 | Major          | Demo identity allows impersonation of any member                              | US-010; ARCHITECTURE deploy  | RV-004    |
| XR-21 | Major          | Idempotency record does not bind the request target or body                   | US-010, US-011; RULES 8      | RV-003    |
| XR-22 | Major          | `Circle.members` `maxItems: 6` conflicts with invited/left rows               | US-001                       | RV-005    |
| XR-23 | Major          | Rotation invariants 4 and 5 conflict; `skipped` presumes D-P02                | US-003; rule 3               | RV-005    |
| XR-24 | Major          | Superseding an agreed proposal is undefined; proposals can be spammed         | US-002; rule 7               | RV-005    |
| XR-25 | Minor          | Forfeit disclosure only arrives after leaving                                 | US-006                       | RV-006    |
| XR-26 | Minor          | `SuggestionSet` outcome not bound to its branch; ADR names a missing response | US-009                       | RV-006    |
| XR-27 | Minor          | Operation count, ADR verification and test claims are inaccurate              | —                            | RV-007    |
| XR-28 | Minor          | Board T1 contradicts API.md; notification emission undefined                  | US-014; rule 3               | RV-007    |
| XR-29 | Major          | Q-002/Q-006 owner tasks depend on the freeze that needs their answers         | —                            | RV-007    |

## Findings

### XR-01 · Freeze blocker · Real-member inference is designed in while Q-002 is open

- **Where:** ARCHITECTURE §Data flows E ("Real-member tie values are computed transiently for host-only positive guidance"); DATA_MODEL §"Real-member graph data"; API §"Host-only data".
- **Against:** CONSTRAINTS ("Real-user visibility is blocked on Q-002"); PHASE1_REVIEW "What I cannot approve", first row ("Any real-user connection inference or display"); US-012.
- **Problem:** The drafts avoid _persisting_ and _returning_ real tie values, but they still specify computing them and acting on them. Inference about real people is the thing PHASE1_REVIEW says it cannot approve. Non-persistence limits leakage; it does not make the inference approved.
- **Requested change:** Gate real-member graph computation closed, the same way payments are gated, until Q-002 is decided. While closed, suggestions use no tie- or drift-derived input, and the contract says so. Record the gate in ADR 0004.
- **Lane A follow-up:** PHASE1_REVIEW marks rule 1 "Satisfied in draft" on the strength of non-persistence. That rating should be revisited (RV-008).

### XR-02 · Freeze blocker · Host guidance travels in unconstrained LLM free text

- **Where:** openapi `Plan.rationale` (string, max 240, LLM-produced); API §"Host-only data"; DATA_MODEL §"Consent and deletion", last bullet.
- **Against:** US-009 ("no person is ranked"), US-012 (guidance "never as a warning, score or diagnosis about named people"), B-07.
- **Problem:** `rationale` is the only field that can carry reconnection guidance, and its constraint ("positive framing") is a description, not something a schema or test can check. Separately, B-07 forbids tie values in prompts, yet the product brief has the copilot build plans "to reconnect drifting pairs". The contract never says what drift signal reaches the prompt. A named pair ("plan something for Sam and Priya") is itself an inference about real people even with no number attached. The host-in-the-flagged-pair case (Q-002) has no handling.
- **Requested change:** Define the guidance input explicitly (none until Q-002 is decided). Produce rationale from a server template or validate it against a closed vocabulary. Extend B-07 to cover pair identities, not only numeric tie values.

### XR-03 · Freeze blocker · Synthetic ledger entries count toward the budget that gates payments

- **Where:** DATA_MODEL derived-pot query (`SUM(amount_cents) ... WHERE circle_id = ?`); approvePlan `422` and createVenuePayment `422` (budget re-derived in transaction); `Circle.potCentsDerived`.
- **Against:** US-004 ("synthetic ledger entries ... are never presented as provider or payment evidence"); US-011.
- **Problem:** The pot sums every entry, synthetic or not, and the same sum authorizes approvals and future venue payments. Once the gate opens, fixture money could pass the budget check for a real sandbox Order. `Circle` gives no indication that the figure includes synthetic entries.
- **Requested change:** Either forbid synthetic and provider entries in the same circle, or derive two sums and use only the verified sum for any payment-path budget check. Expose which sum a figure is. Add a negative test.

### XR-04 · Freeze blocker · Non-synthetic ledger rows can exist without verified provenance

- **Where:** DATA_MODEL §"Money, integer cents and the append-only ledger" and the `ledger_entry` row in §Entities.
- **Against:** ARCHITECTURE §D ("a verified provider webhook ... is the only thing that may append a ledger entry"); US-011; RULES 9 and 10.
- **Problem:** The constraints say synthetic rows have no `provider_event_id`, and a set `provider_event_id` must reference a verified event. Nothing requires a non-synthetic row to have one. A row with `synthetic = 0` and `provider_event_id IS NULL` passes, including any `kind = 'correction'` row. Corrections have no defined author or authority, so they are an unreviewed path to change the pot. `corrects_entry_id` is mentioned in prose but missing from the entity table.
- **Requested change:** Add a constraint that every non-synthetic, non-correction row has `provider_event_id`. Define who may write corrections, under what approval, and record that decision in an ADR; it is a money-flow decision and needs the human gate. Add `corrects_entry_id` to the entity table.

### XR-05 · Freeze blocker · `potCentsDerived` has minimum 0 but the signed sum can be negative

- **Where:** openapi `Circle.potCentsDerived` and `Ledger.potCentsDerived` use `AmountCents` (`minimum: 0`); DATA_MODEL makes `ledger_entry.amount_cents` signed.
- **Against:** US-004.
- **Problem:** A correction, or an outflow event that arrives before the matching contribution event (the out-of-order case ARCHITECTURE itself lists), produces a negative sum. The server would then either emit a schema-invalid response or clamp the value. Clamping would misstate the money.
- **Requested change:** State the invariant that keeps the sum non-negative and how it is enforced, or type the field as signed and define how a negative value is displayed. Add a test either way.

### XR-06 · Freeze blocker · Payment-gate preconditions omit Q-006

- **Where:** ADR 0004 decision 4; API §"Payment gate"; openapi `startContributionSubscription` and `createVenuePayment` descriptions. All three say the gate opens after YT-006 evidence and human money-flow approval.
- **Against:** PHASE1_REVIEW rule 7 residual risk ("a pause that silently fails to stop a charge would be coercive, so the gate must stay closed until decided"); US-005.
- **Problem:** A human could open the gate with YT-006 evidence while pause collection effects are still undecided. That is exactly the coercive case PHASE1_REVIEW names.
- **Requested change:** Add Q-006 resolution, and the YT-025 legal assessment, to the gate's opening conditions and to `PaymentGateError.gate.blockingTasks`.

### XR-07 · Freeze blocker · Paused members break the size cap, agreement completion and version semantics

- **Where:** DATA_MODEL rotation invariant 1 (cap counts `state = 'accepted'`) and invariant 8 (version bumps on "any accepted-membership change"); `participation_pause` table; openapi `Membership.state` enum (`invited`, `accepted`, `paused`, `left`); API authorization matrix (paused members may read but not propose or agree).
- **Against:** US-001 (six-member cap), US-002 ("every current accepted member"), US-005 (pause without pressure).
- **Problem:** Paused state has two sources of truth: `membership.state = 'paused'` in the API and a `participation_pause` row in the schema. The consequences are undefined:
  1. If a paused member is not `accepted`, a pause frees a seat. A seventh person can join, and the circle has seven members when the pause ends.
  2. If paused members count toward `requiredCount`, agreement cannot complete while anyone is paused, because paused members cannot agree. One member's pause blocks the group, which invites pressure on that member. If they do not count, `requiredCount` visibly drops when someone pauses, which discloses the pause.
  3. Whether a pause bumps `membership_version` is undefined. If it does, one person's pause invalidates everyone's agreement in a way the whole circle can see.
- **Requested change:** Pick one representation of pause. Define its effect on the cap, `requiredCount`, `membership_version` and `readyForPlanning`. Where the answer is policy, mark it `policy_pending` under Q-006 instead of leaving it implicit.

### XR-08 · Major · Peer view exposes `paused`, pre-deciding Q-006

- **Where:** openapi `Circle.members[].state` enum includes `paused` and is returned to every member; `ParticipationState.peerVisibleDetail` is `neutral_state_only`.
- **Against:** US-005 ("peer-visible status details ... are shown as policy-pending (Q-006) and are not executed or implied as settled"); PRD "Private pause" row ("Neutral status leakage ... remain gated by Q-006"); GLOSSARY ("Pause: private hardship accommodation").
- **Problem:** The glossary defines pause as a hardship accommodation, so showing the word "paused" to peers is the disclosure. The contract settles what peers see while the PRD says that decision is gated.
- **Requested change:** Treat peer-visible pause state as `policy_pending` until Q-006 is decided and Privacy and Behavioral record a choice. This review does not propose replacement wording; that belongs to Content and Behavioral.

### XR-09 · Major · Aggregate counts contradict US-002 and identify dissent in small circles

- **Where:** openapi `ContributionProposal.agreementProgress` (`agreedCount`, `requiredCount`, `ownAgreement`), visible to every member; `LedgerEntry` (`contribution_received` with `occurredAt`), visible to every member.
- **Against:** US-002 ("shows 'not yet agreed' without naming, **counting** or ranking who declined"). PHASE1_REVIEW B-03 permits counts ("Agreement responses expose counts only"). The contract follows B-03.
- **Problem:** The two Lane A baselines contradict each other, and the contract chose one of them. In a circle of three, a count plus your own state narrows the non-agreeing member to one of two people. The same arithmetic on monthly `contribution_received` entries shows that someone did not pay, which reveals a pause or hardship (rule 7, US-005).
- **Requested change:** Product Manager and Behavioral Scientist decide whether counts are allowed (RV-008). The Architect then aligns the schema. Privacy should consider the same small-group suppression for ledger entries that USER_STORIES already requires for research reporting.

### XR-10 · Major · Stale-approval triggers are incomplete; status codes disagree

- **Where:** openapi `approvePlan` description and `409`; `createVenuePayment` `422`; ADR 0004; ARCHITECTURE failure table ("Plan or amount changed after approval"); DATA_MODEL "Stale approvals".
- **Against:** US-003 ("stale host approvals are invalidated" on membership change or pause); US-006 (host may leave mid-cycle); US-010; GLOSSARY "Host approval".
- **Problem:** The contract defines staleness only as a mismatch in plan version, venue or amount. Several cases are missing: the host leaves or pauses, the turn is no longer current or is suspended, `membership_version` changes, the agreed contribution changes, or the derived budget falls below the approved total. Separately, staleness is `409` on `approvePlan` but `422 approval_stale` on `createVenuePayment` and in the API error table. The `approvePlan` `409` text refers to "the approved snapshot" before any approval exists.
- **Requested change:** List every invalidation trigger in API.md and DATA_MODEL, record the reason with `invalidated_at`, pick one status code, and add each trigger to the B-13 negative-path list.

### XR-11 · Major · Manual non-AI plan path has no operation

- **Where:** openapi `Plan.source` includes `manual_fixed_list`; `SuggestionSet.manualAlternative` is `browse_fixed_venues_or_defer`; ARCHITECTURE §B ("A manual fixed-list path is always available").
- **Against:** US-009 ("I can browse the approved fixed venues or defer, and the same budget, turn and payment gates apply to a manually chosen plan"); PRD D-P03.
- **Problem:** `approvePlan` needs an existing `planId` and `planVersion`, and no operation creates a manual plan. The non-AI path therefore cannot be approved.
- **Requested change:** Add an operation that creates a manual plan from a fixed venue, with the same host, readiness and budget checks, or document another route to approval.

### XR-12 · Major · Budget is client-supplied; plan price is not tied to the venue

- **Where:** openapi `CreatePlanSuggestionsRequest.budgetCents` (required, client-supplied); `Plan.totalCents`; `Venue.estimatedCostCents`.
- **Against:** ARCHITECTURE boundary 1 ("the browser is never trusted for ... budget"); US-009 ("each within the conceptual budget"; "no ... invented price").
- **Problem:** Suggestions are bounded by whatever the client sends, and nothing links a plan's total to the fixture venue cost. A plan can carry an invented price that is only caught later at approval, if at all.
- **Requested change:** The server derives the budget, and the client may only request a lower cap. Define how `totalCents` is derived from venue data and reject model output that differs.

### XR-13 · Major · Free-text prompt inputs have no enforcement

- **Where:** openapi `CreatePlanSuggestionsRequest.availabilityNote` (200 chars) and `preferences` (up to 10 × 40 chars).
- **Against:** US-009 (prompts carry no emails, payment data, hardship information or tie scores); B-07; RULES 12.
- **Problem:** The description says such data is "never accepted here", but free text cannot be checked against that. The fields carry host-typed text into the prompt, which is also a prompt-injection route.
- **Requested change:** Use a closed vocabulary or a validated format, or name the filter and its tests. Map the injection risk in YT-023 and add LLM eval fixtures for it (YT-020).

### XR-14 · Major · No pending/unverified payment state

- **Where:** openapi `PaymentState.state` and `SubscriptionState.state` enums; ARCHITECTURE failure table ("Attempt stays non-final ... displayed as unverified").
- **Against:** US-011 ("any payment failure, pending state or timeout ... shown honestly as unverified or failed, never as completed").
- **Problem:** Neither enum has a value for an unverified or reconciling attempt, so an implementation has to report a timed-out capture as `order_created`, `captured` or `failed`. Each of those is wrong.
- **Requested change:** Add an explicit `unverified` or `reconciling` value and define its exit transitions.

### XR-15 · Major · Former members lose access to their own money state; matrix incomplete

- **Where:** API authorization matrix; openapi `getOwnSubscriptionState` is circle-scoped, and non-members get `404`.
- **Against:** US-006 ("any pending provider state is shown as unverified"); Q-006 (own-data access).
- **Problem:** After leaving, a member gets `404` on the circle-scoped subscription route. They cannot see a pending provider state for money that was theirs. The matrix also leaves out `getOwnSubscriptionState`, `startContributionSubscription`, `getVenuePaymentState`, `listVenues`, `getCurrentMember` and both session operations.
- **Requested change:** Complete the matrix. Define post-exit access to the caller's own subscription and payment state, scoped so that no other member's data is exposed.

### XR-16 · Major · Consent applies retroactively to pre-consent history

- **Where:** DATA_MODEL §"Real-member graph data" (signals live in `attendance`) and §"Consent and deletion" (filtering by current `tracking_enabled`; `tracking_consent` keeps one row per member); openapi `ConsentState.updatedAt` is required even when no choice has been made.
- **Against:** US-007 ("Given tracking is off for me, then no interaction signal about me is recorded for graph computation"); rule 6.
- **Problem:** Attendance is recorded whatever the consent state, and filtering uses the current state. A member who turns tracking on therefore makes their whole earlier history into graph input. With only the latest consent row kept, nobody can later show what the consent state was when a signal was recorded. Nothing records which disclosure text the member consented to.
- **Requested change:** Privacy decides whether consent is prospective, meaning only signals after the consent timestamp count (RV-009). The Architect then adds consent history, a disclosure version, and a nullable `updatedAt` for "never chosen".

### XR-17 · Major · Withdrawal does not invalidate persisted plans or suggestion sets

- **Where:** DATA_MODEL `plan` (immutable, persisted) and `suggestion_set`; the cache key `(circle_id, max(tracking_consent.updated_at), fixture_revision)` covers graph artifacts only. API `Plan.rationale` has no column in the DATA_MODEL `plan` table, and the table has no link from `plan` to `suggestion_set`.
- **Against:** US-008 ("a cached or previously computed artifact ... is invalidated before any subsequent use"; downstream uses include host guidance); B-05.
- **Problem:** Once XR-01 is resolved, any plan built with an input involving a member who later withdraws stays readable and approvable.
- **Requested change:** Extend invalidation to suggestion sets and plans whose inputs involved the withdrawing member. Reconcile the `plan` table with the API `Plan` schema.

### XR-18 · Major · Not-ready refusal exists only on suggestions

- **Where:** openapi `createPlanSuggestions` declares `409 circle_not_ready`; `approvePlan` and `createVenuePayment` do not.
- **Against:** US-001 ("any funded-planning action ... is refused as not-ready and the refusal names the member minimum"); PRD D-P02.
- **Problem:** A circle that drops below three members after suggestions were generated can still approve and, once the gate opens, pay. The `Error` schema also has no structured field for the member minimum.
- **Requested change:** Add `circle_not_ready` to both operations and carry the minimum in a structured detail.

### XR-19 · Major · Operator advance/reset, invitation decline and circle setup have no operation

- **Where:** DATA_MODEL rotation invariant 7 ("Turn advancement is a recorded demo-operator action"); PRD "Demo operator/reviewer" and "Invited member" journeys.
- **Against:** US-003 ("when the demo operator advances it"); PRD ("accept membership or decline"; "select/reset synthetic fixtures").
- **Problem:** No route advances a turn or resets fixtures, and no operator identity or authorization exists. No route declines an invitation. The contract does not say whether creating circles and invitations is seed-only.
- **Requested change:** Add these operations with an operator authorization model, or state that they are seed-only or script-only and outside the HTTP surface.

### XR-20 · Major · Demo identity allows impersonation of any member

- **Where:** openapi `createSession` (any `seededMemberId`, no secret); ARCHITECTURE §"Deployment boundary" (webhook ingress may need a public URL; YT-032 hosted sandbox).
- **Against:** US-010 (only the current host approves); ARCHITECTURE "Host-scoped actions".
- **Problem:** This is acceptable on loopback. In any reachable environment, anyone can start a session as the host, approve a plan and, once the gate opens, create venue payments.
- **Requested change:** Make a non-loopback identity model a precondition for YT-032 and for opening the gate, and map the risk in YT-023.

### XR-21 · Major · Idempotency record does not bind the request target or body

- **Where:** DATA_MODEL `idempotency_record` primary key `(actor_member_id, operation, idempotency_key)`; API §"Idempotency (internal)".
- **Against:** US-010, US-011; RULES 8.
- **Problem:** Reusing a key for the same operation on a different target replays the wrong response. One example: `leaveCircle` on circle B with the key used for circle A returns A's result and does not leave B. Another: `createVenuePayment` with a different `approvalId` replays the earlier attempt. The API rejects a reused key across different operations but says nothing about the same operation with a different payload.
- **Requested change:** Store the path parameters and a request fingerprint with the record, reject a mismatch, and test it.

### XR-22 · Major · `Circle.members` `maxItems: 6` conflicts with invited/left rows

- **Where:** openapi `Circle.members` (`maxItems: 6`; item `state` includes `invited` and `left`).
- **Against:** US-001.
- **Problem:** A full circle with any pending invitation or departed member produces a schema-invalid response. The list also shows every member the names of people who were invited but have not accepted, and of people who left. That is a disclosure decision the drafts do not record.
- **Requested change:** Define which states appear in the peer view and set the bound to match. Privacy confirms the visibility of invitees and former members.

### XR-23 · Major · Rotation invariants 4 and 5 conflict; `skipped` presumes D-P02

- **Where:** DATA_MODEL rotation invariants 4 ("the new membership takes effect from the next cycle") and 5 ("On pause, leave or join mid-cycle, affected future turns move to `state = 'suspended'`"); openapi `Turn.state` includes `skipped`.
- **Against:** US-003; rule 3 (no shame).
- **Problem:** For a mid-cycle join, invariant 4 says the current cycle continues and invariant 5 says it suspends. The `skipped` value implies a host-decline rule that D-P02 says is undecided. A `skipped` marker next to a named host's turn is also a potential shame signal visible to the whole circle.
- **Requested change:** Make invariants 4 and 5 agree. Remove `skipped` until D-P02 is decided, or define it with Behavioral review.

### XR-24 · Major · Superseding an agreed proposal is undefined; proposals can be spammed

- **Where:** openapi `createContributionProposal` ("supersedes any unagreed proposal"; accepts `membershipVersion` but declares no `409 version_stale`).
- **Against:** US-002 (a changed amount invalidates the prior agreement for the new version); rule 7; YT-026 (coercion).
- **Problem:** The contract does not say whether a new proposal against an agreed amount suspends that amount at once or only once the new proposal is agreed. Any accepted member can create proposals without limit. Repeated proposals are a way to pressure dissenters.
- **Requested change:** Define the transition and declare `409` for a stale `membershipVersion`. Trust & Safety assesses limits in YT-026.

### XR-25 · Minor · Forfeit disclosure only arrives after leaving

- **Where:** openapi `LeaveResult.forfeitPolicy` is returned only by the completed leave.
- **Against:** US-006 ("Given the confirmation step, then it states the disclosed forfeit proposal").
- **Requested change:** State that the confirmation text is static Content-owned copy, or add a read that returns the disclosure before confirmation.

### XR-26 · Minor · `SuggestionSet` outcome not bound to its branch; ADR names a missing response

- **Where:** openapi `SuggestionSet.oneOf` does not constrain `outcome`, so `outcome: "three_plans"` with `unavailableReason` validates. Plans have no distinctness rule. ADR 0004 decision 5 names a `suggestionsUnavailable` response that does not exist in the spec; the spec uses `outcome: "unavailable"`.
- **Against:** US-009 ("exactly three **distinct** schema-valid plans").
- **Requested change:** Put `outcome` `const` values inside each branch, define distinctness (for example, distinct venue or plan content), and correct the ADR.

### XR-27 · Minor · Operation count, ADR verification and test claims are inaccurate

- The YT-009 handoff and STATUS.md say 21 operations. `openapi.json` defines **23** (counted by script on this branch).
- ADR 0004 §Verification requires the spec to "parse and validate as OpenAPI 3.1". The YT-009 handoff says metaschema validation was not done. That verification step is unmet and should be recorded as such.
- `tests/contract.test.mjs` asserts `ContributionAmountCents.minimum === 100`, which turns the undecided D-P01 floor into a test.
- The API error table lists `429 rate_limited` and `500 internal_error`, but no operation declares them.

### XR-28 · Minor · Board T1 contradicts API.md; notification emission undefined

- BOARD touchpoint T1 says Alan "builds against `openapi.json` v0.1.0-draft immediately". API.md says building may start "only after the YT-014 freeze". The human's current instruction is that Phase 2 is not released. T1 should be corrected (Orchestrator).
- ARCHITECTURE's failure table says an invalid webhook causes "no notification", which implies valid events do cause notifications. No notification is approved (PHASE1_REVIEW; YT-013). The contract should state that no notification is emitted until Content and Behavioral approve the copy and timing.

### XR-29 · Major · Q-002/Q-006 owner tasks depend on the freeze that needs their answers

- **Where:** BOARD YT-014 (freeze requires Q-001/Q-002/Q-006 decisions; STATUS "Next handoff"); YT-024 Privacy/Q-002 and YT-025 Legal (both depend on YT-014).
- **Problem:** The freeze waits on decisions whose owning tasks cannot start until after the freeze. The repository test does not catch this because the questions are not task rows.
- **Requested change:** The Orchestrator re-sequences, either by letting YT-024/YT-025 decision work run before YT-014 or by letting YT-014 freeze with these behaviors explicitly gated closed.

## B-check status against the contract

| Check | Contract status                                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------- |
| B-01  | Holds structurally; `contract.test.mjs` scans for closeness fields. Does not cover free text (XR-02).            |
| B-02  | Holds; asserted by `contract.test.mjs`.                                                                          |
| B-03  | Holds as written, but conflicts with US-002 (XR-09).                                                             |
| B-04  | Documented in DATA_MODEL; untestable until code exists. Retroactive history is open (XR-16).                     |
| B-05  | Documented for graph artifacts only; plans and suggestion sets are not covered (XR-17).                          |
| B-06  | Documented (DATA_MODEL invariant 6); `leaveCircle` declares no `409`. Approval invalidation is missing (XR-10).  |
| B-07  | Documented for tie values, pause rows and payment fields; pair identities and free text are open (XR-02, XR-13). |
| B-13  | The negative-path list should add the XR-10 staleness triggers, XR-03 synthetic-budget and XR-21 key reuse.      |

B-08 to B-12 and B-14 concern screens and the demo script; the contract does not affect them.

## Story coverage

| Story  | Contract coverage and gaps                                                                    |
| ------ | --------------------------------------------------------------------------------------------- |
| US-001 | Cap, `404` isolation and acceptance side effects covered. Gaps: XR-07, XR-18, XR-22.          |
| US-002 | Bounds and version-binding covered. Gaps: XR-07, XR-09, XR-24.                                |
| US-003 | Deterministic order covered. Gaps: XR-10, XR-19, XR-23.                                       |
| US-004 | Derived sum covered. Gaps: XR-03, XR-04, XR-05; `potLabel` optional and absent from `Ledger`. |
| US-005 | No reason field covered. Gaps: XR-06, XR-07, XR-08, XR-09.                                    |
| US-006 | Leave never blocked covered. Gaps: XR-10, XR-15, XR-25.                                       |
| US-007 | Default off covered. Gap: XR-16.                                                              |
| US-008 | Incident-edge exclusion covered. Gap: XR-17.                                                  |
| US-009 | Exactly-three count covered. Gaps: XR-02, XR-11, XR-12, XR-13, XR-26.                         |
| US-010 | Snapshot and constants covered. Gaps: XR-10, XR-20, XR-21.                                    |
| US-011 | Gate, signature and dedup covered. Gaps: XR-03, XR-04, XR-14.                                 |
| US-012 | Route-enforced synthetic graph covered. Gaps: XR-01, XR-02.                                   |
| US-013 | Mostly a UI concern; error `details` support association. No contract gap found.              |
| US-014 | No re-engagement surface exists. Gap: XR-28 (notification emission).                          |

US-004's last gap: US-004 requires every pot display to be labelled, but `Circle.potLabel` is optional and `Ledger` has none. This is filed under RV-006.

## What this review confirms

These safeguards are present in the drafts and match the stories: no reason field on pause, `isPayment`/`isReservation`/`penaltyApplied` constants, a payment gate with no simulated-success response, `404` for non-members, an append-only ledger with a unique provider event id, a synthetic-only numeric graph enforced by route, and integer-cents money throughout. Confirming they exist in documents is not evidence that any runtime enforces them.

## Not done by this review

- No Lane S file was edited. No fix is proposed as text for those files beyond the requested changes above.
- No policy was decided. Q-001, Q-002, Q-005 and Q-006 remain open, and several findings (XR-06 to XR-09, XR-16, XR-22) depend on them.
- The reverse half of T4, Lane S review of the Lane A drafts, is Shaahid's and is not covered here.
