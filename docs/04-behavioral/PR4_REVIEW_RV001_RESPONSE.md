# Review of PR #4 — RV-001/002/003 landing (Lane A → Lane S)

**Status:** Independent review comments for GitHub PR #4 (`architect/xr-fixes` → `main`, tip `5832210`), which re-targets the merged-to-the-wrong-base PR #3. **Verdict: approve the contract fixes; request two corrections before the board is treated as settled.** Not a contract freeze, not a money-flow approval, not behavioral sign-off.
**Reviewer:** reviewer, kiro-lane-a-xr1 (Human: Alan, GitHub `lilNewbie`). Date: November 12, 2026.
**Independence:** I authored none of the reviewed Lane S files (`openapi.json`, `DATA_MODEL.md`, `API.md`, `ARCHITECTURE.md`, ADR 0004/0005, `CROSS_REVIEW_RESPONSE.md`, the contract tests). This is a genuine independent review of the RV-001 response. It does **not** cover the reverse direction: `LANE_A_REVIEW.md` (RV-002) is Shaahid's review of my lane and is addressed separately, below, as work I own — I am not approving my own lane here.

## What I verified, and how

I inspected the files on `origin/architect/xr-fixes` directly (read-only) and checked each mechanical claim against the actual spec rather than trusting the response table. Commands run against the branch blobs:

- Operation count: **24** (`XR-27` claim confirmed; was 23 on the merged branch, 21 in the old handoff).
- `Error.code` enum now contains `graph_gate_blocked`, `insufficient_sender_balance`, `payment_gate_blocked`, `budget_exceeded` — XR-01, ADR 0005 fee/balance, XR-06.
- `Plan.rationale` removed; `Plan.rationaleKey` present — XR-02.
- `potCentsVerified` and `potCentsSynthetic` present alongside `potCentsDerived` — XR-03.
- `SignedAmountCents` schema present — XR-05.
- `PauseRequest.additionalProperties === false` still holds — XR-07 did not regress the no-reason guarantee.
- `createManualPlan` present — XR-11.
- `PaymentState.state` = `[blocked, payout_pending, unverified, payout_success, payout_denied, failed]`; `SubscriptionState.state` includes `unverified` — XR-14 and the ADR 0005 Payouts rename.
- `pendingInvitationCount` present; peer view accepted-only — XR-22.
- `Turn.state` = `[upcoming, current, completed, suspended]`, `skipped` gone — XR-23.
- `SuggestionSet.plans.uniqueItems === true`, plus a distinct-venue description — XR-26.
- `DATA_MODEL` provenance CHECK `(synthetic = 1 OR kind = 'correction' OR provider_event_id IS NOT NULL)` and `corrects_entry_id` added to the entity table — XR-04.
- Contract test file references `graph_gate`, `rationaleKey`, `potCentsVerified`, `createManualPlan`, `unverified`, `SignedAmountCents`, `drift`, an operation-count assertion — the fixes carry tests, not just prose.
- `x-frozen: false`, version `0.1.0-draft` — nothing pretends to be frozen.

**Every freeze-blocker fix and every major fix I could check mechanically is actually present in the spec, with a test or an explicit schema constraint.** This is the rare case where the response table did not overstate what the diff contains.

## The seven freeze blockers: resolved

| XR    | What was wrong                                      | Fix verified                                                                                                                                      | Verdict                                                                                                    |
| ----- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| XR-01 | Real-member inference designed in while Q-002 open  | `503 graph_gate_blocked`; no tie/drift computed, stored, returned or sent to the prompt while closed                                              | Resolved. This is the right mechanism — a gate, not a non-persistence promise.                             |
| XR-02 | Guidance in unconstrained LLM free text             | `rationaleKey` from a closed vocabulary; test rejects drift/risk/score/rank keys; model writes no host prose                                      | Resolved, and it also closes the prompt-injection surface I raised in XR-13.                               |
| XR-03 | Synthetic money in the payment budget check         | `potCentsVerified` (synthetic-free, provider-verified) is the only figure that may gate a payment                                                 | Resolved. The architect correctly called this the most serious defect.                                     |
| XR-04 | Unverified non-synthetic ledger rows                | provenance CHECK added; corrections stay unimplemented pending their own ADR + human money gate                                                   | Resolved for the demo; correction authority correctly deferred, not invented.                              |
| XR-05 | Non-negative type on a signed sum                   | `SignedAmountCents` for derived sums; a deficit is representable                                                                                  | Resolved.                                                                                                  |
| XR-06 | Gate could open with Q-006 unresolved               | gate now also requires Q-006 and the YT-025 legal assessment                                                                                      | Resolved. This was the coercion risk Behavioral named.                                                     |
| XR-07 | Paused members break seat cap / agreement / version | one representation (`membership.state` + `paused_at`); a paused member keeps their seat; no version bump; `requiredCount` marked `policy_pending` | Resolved as far as an architect can; the residual `requiredCount` question is correctly deferred to Q-006. |

## The eight deferrals: correctly assigned

I checked each deferral names the right owner and does not quietly decide a policy:

- **XR-08** (peer pause visibility) → Privacy + Behavioral (Q-006). Correct. The contract now ships `participationStateVisibility: policy_pending` instead of `paused`, which is the honest holding state.
- **XR-09** (US-002 "no counting" vs B-03 "counts only") → PM + Behavioral (RV-008). Correct, and it is my lane's contradiction to resolve, not the architect's. He also flagged the same leak on monthly `contribution_received` entries, which I had only raised for agreement counts — a fair extension.
- **XR-15** (post-exit own-money access) → Privacy + Legal (Q-006). Correct; authorization matrix is now complete, no route added.
- **XR-16** (prospective vs retroactive consent) → Privacy (RV-009). Correct; he added consent history + disclosure version so either answer stays buildable, and the graph gate means nothing computes meanwhile.
- **XR-17** (withdrawal invalidates plans/suggestions) → Privacy for scope. Partly fixed: `derived_from_member_ids` added and the `plan` table reconciled with the API schema; only the "what counts as derived" scope is deferred. Reasonable.
- **XR-19** (operator/decline routes) → next revision. Documented as deliberately out of the HTTP surface pending an operator auth model. Acceptable for a demo; see my one caveat below.
- **XR-20** (non-loopback identity) → SRE + Security (YT-023), as a precondition for YT-032 and gate opening. Correct and appropriately strengthened from "later" to "precondition".
- **XR-25** (forfeit disclosure before confirm) → Content. Correct; FLOWS already requires it at the confirmation step.

No deferral is a disguised rejection, and none guesses at a money/privacy/legal answer. That matches the rules.

## Requested corrections before the board is treated as settled

These are not contract defects; they are two overstatements on the board/status that the PR touches. Filed as RV-010 and RV-011.

### RC-1 (board wording) · Q-001 "ANSWERED" and Q-004 "MOOT" overstate the evidence · RV-010

The board now reads **Q-001 ANSWERED** and **Q-004 MOOT**. ADR 0005's own evidence table shows the subscription at `APPROVAL_PENDING` and the webhook leg `blocked (YT-032)`. So what is actually proven is the **outbound** payout (create → readback SUCCESS). The **inbound** contribution leg — subscription active, payment received — was never completed, and there is no verified webhook. "ANSWERED" and "MOOT" read as if the end-to-end pot-funds-the-venue flow is demonstrated; it is not. The ADR body and the board's own prose both say the money flow is unapproved and the gate stays closed, so the fix is only the two status words: Q-001 is better as "mechanism verified; end-to-end funding not demonstrated (subscription APPROVAL_PENDING, webhook blocked)", and Q-004 as "no fallback needed on current evidence; contingent on the inbound leg." Owner: Payments/Orchestrator (Lane S). I cannot edit the board rows beyond my own.

### RC-2 (process) · PR #2 was a money-mechanism change merged to main without a recorded human money-flow decision · RV-011

PR #2 replaced Orders with Payouts and moved Payouts from the cut list into core scope. The PR states "Human approval for money flow — NOT given," and its position is that it changes design only and the gate stays closed — a defensible reading, since no code moves money. But RULES rule 24 gates both **money-flow changes** and **main merges** on explicit human approval, and this landed on main. This needs the human (Shaahid) to record, on the board, either "the Payouts design direction is approved as the money mechanism; the execution gate remains closed" or "merged as documentation; the money-flow decision is still pending." Right now the board implies the first by calling Q-001 answered, while the PR text implies the second. One recorded decision removes the ambiguity. Owner: human + Orchestrator.

## Smaller notes (not blocking)

- **XR-19 caveat:** moving operator advance and fixture reset outside HTTP is fine, but "declining an invitation" being filed to a later revision leaves US-001's decline path (PRD "accept membership or decline") with no contract route. Worth a tracked row so it is not forgotten, not a blocker for the freeze.
- **OSS-02 is the honest standout.** The architect accepted that my XR-01 claim "no tie/drift input reaches the prompt" cannot be proven by a contract test, because prompt construction is in-process and invisible to the spec — it is now a required service-level prompt-assertion test in YT-019/YT-020, and the claim is marked unverified until that test exists. That is exactly right, and it is a stronger close than I asked for.
- **Metaschema validation** is now recorded as unmet rather than claimed (XR-27). Good; it should stay unmet-and-stated until a real 3.1 metaschema validator runs.

## Verification caveat I am obligated to state

I could not get a clean `make check` run on my Windows machine for this branch. `make` is not installed, and every clone I made checked files out with CRLF line endings, which makes Prettier flag all 88 files and makes two `repository.test.mjs` assertions fail on `\r\n` vs `\n` (the role-pointer equality at line 171 and the board `## TODO` split at line 199). These are **checkout artifacts of my environment, not defects in the PR**: the failing assertions print `actual: '...\r\n'`, the committed blobs are LF, there is no `.gitattributes`, and the PR reports hosted CI green on Linux (LF). I confirmed the spec-level facts above by reading the committed blobs directly, which is not affected by line endings. I am **not** independently certifying the hosted CI run; I am relying on the PR's statement that it is green, and recommending the Orchestrator confirm the hosted run before closing the gate on CI evidence.

## Bottom line

The RV-001 response is thorough, honest about what the architect got wrong, and the fixes are real and tested — not prose. I approve the contract changes in PR #4. Two things must be recorded before the board reads as settled: the Q-001/Q-004 wording (RV-010) and the PR #2 money-flow/main-merge decision (RV-011). The freeze (YT-014) still cannot proceed: Q-002, Q-005 and Q-006 are open, and both the payment and graph gates are closed. The reverse-direction review of my own lane (RV-002 / `LANE_A_REVIEW.md`) is addressed as my own follow-up work, not approved here.
