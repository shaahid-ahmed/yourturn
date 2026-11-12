# Phase 1 behavioral gate review

**Status:** Phase 1 review for YT-010. **This is not a product sign-off.** It reviews Phase 1 _documents_ against the eight hard rules and names what cannot be approved yet. Revision-bound release sign-off is YT-030, after real screens and code exist.
**Owner:** Behavioral Scientist. Date: November 11, 2026. Baseline: [PRINCIPLES.md](PRINCIPLES.md), [ETHICS_CHECKLIST.md](ETHICS_CHECKLIST.md), [RESEARCH_NOTES.md](RESEARCH_NOTES.md) — the eight rules and the cited-source limits there are unchanged by this review.

## Scope of what was reviewed

Reviewed as drafted in this branch: `docs/01-product/PRD.md`, `docs/01-product/USER_STORIES.md`, `docs/02-design/FLOWS.md`, `docs/02-design/DESIGN_SYSTEM.md`, `docs/03-architecture/API.md`, `docs/03-architecture/openapi.json`, `docs/03-architecture/DATA_MODEL.md`, `docs/03-architecture/ARCHITECTURE.md`, `docs/decisions/0004-phase-1-contracts.md`.

Not reviewed, because it does not exist: any running interface, any model, any prompt output, any notification, any real-user data flow. **No claim in this file asserts that a user-facing behavior was observed.**

## Rule-by-rule review of the drafts

| Rule                                 | Draft status                    | Evidence in the drafts                                                                                                                                                                                             | Residual risk                                                                                                                                                  |
| ------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Drift is private (E-01)              | **Satisfied in draft**          | Numeric values exist only on the synthetic fixture route; real-member tie values are never persisted or returned (DATA_MODEL "Deliberate omissions", API invariant 5); host guidance is positive plan framing only | A host is sometimes _in_ the flagged pair; that case is unresolved (Q-002) and must not be designed around silently                                            |
| 2. No public leaderboards (E-02)        | **Satisfied in draft**          | Never-build list in DESIGN_SYSTEM; member row carries name + neutral state only; no score/rank/streak schema exists                                                                                                | Any future "activity" or "reliability" surface would reintroduce this and needs a new review                                                                   |
| 3. No guilt or shame copy (E-03)        | **Partially open by design**    | Banned patterns listed in VOICE_AND_TONE; `penaltyApplied: false` constant; skipping is never converted into a status change                                                                                       | No copy has been written yet; every notification needs dual Content + Behavioral approval before it exists                                                     |
| 4. No dark patterns (E-04)              | **Satisfied in draft**          | Two-activation leave with equal-weight Cancel; no retention offer, no pre-checked consent, no countdown, no auto-dismissing error; consent off by default                                                          | Visual implementation can still create asymmetry; YT-029/YT-030 must check real screens                                                                        |
| 5. Opting out is easy (E-05)            | **Satisfied in draft**          | US-006 two activations from an ordinary surface, keyboard-equivalent; exit never blocked, including for the current host                                                                                           | Forfeit _consequence_ is undecided (Q-006); the draft correctly labels it a proposal rather than a right                                                       |
| 6. Consent to the graph (E-06)          | **Satisfied in draft, one gap** | Default off; separate affirmative choice; withdrawal excludes all incident edges including reconstruction from counterparts; cache invalidation keyed on consent timestamp                                         | Own-data access is deliberately `policy_pending`; a member currently cannot see their own data — acceptable only as a temporary, stated gap (Q-006)            |
| 7. Money never becomes coercion (E-07)  | **Satisfied in draft**          | Whole-group agreement bound to version; 1500-cent ceiling in schema; aggregate-only progress so dissent is unattributable; pause has **no reason field in the wire format**                                        | Collection effect of a pause is unresolved (Q-006); a pause that silently fails to stop a charge would be coercive, so the gate must stay closed until decided |
| 8. Every behavioral claim is sourced (E-08) | **Satisfied in draft**          | PRD adds no empirical claims; UX personas are labelled invented; research register unchanged; measurement targets are framed as targets                                                                            | Pitch (YT-034) is the real exposure point; unsourced claims must be cut there                                                                                  |

## What I can approve at this stage

1. The **structural safeguards** in the draft contract: no tie-score column or field for real members, no reason field for pause, aggregate-only agreement progress, `isPayment`/`isReservation`/`penaltyApplied` false constants, synthetic-only numeric graph with a server-enforced boundary. These make several rules violations _unrepresentable_ rather than merely discouraged, which is the right mechanism.
2. The **honest-pending pattern** (`policy_pending` enums, `payment_gate_blocked`, "advancement suspended") in place of invented outcomes.
3. The **non-color + text-equivalent** treatment of the drift illustration, which keeps the demo moment legible without turning a person into a red dot.

## What I cannot approve, and why

| Item                                          | Why not                                                                       | Who decides                   |
| --------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------- |
| Any real-user connection inference or display | Q-002 open; a labelled fixture does not validate inference about real friends | Privacy + Behavioral + human  |
| Any notification, reminder or nudge           | No copy exists; rule 3 requires dual approval of the actual text and timing   | Content Designer + Behavioral |
| Pause/leave money consequences                | Q-006 open; a pause that does not actually stop collection is coercive        | Legal + Payments + human      |
| Forfeit as a stated rule                      | Q-006 open; disclosure of a proposal is not a legal right                     | Legal + human                 |
| Own-data access design                        | Q-006 open; access must not expose a counterpart's data                       | Privacy                       |
| Drift model behavior                          | No model exists; fairness, missingness and withdrawal handling are untested   | ML + Behavioral at YT-019     |
| Any claim that YourTurn improves friendships  | No evidence exists and none is planned in this timebox                        | — (claim must be cut)         |

## Testable checks handed to other roles

For Architect/Backend (contract and implementation):

- **B-01** No response schema outside `SyntheticGraph` contains a numeric closeness value; assert by schema scan.
- **B-02** `PauseRequest` has `additionalProperties: false` and no reason-like property; assert by schema scan.
- **B-03** Agreement responses expose aggregate counts only ("2 of 4 agreed"), never a per-member list. In circles of exactly 3, "2 of 3 agreed" de-anonymizes the holdout; the product must not expose counts in that case — show "not yet agreed" only. (RV-008 resolution)
- **B-04** Graph computation excludes every pair containing a tracking-off member; assert with a fixture where one side withdrew and the counterpart retains history.
- **B-05** A consent change invalidates cached graph artifacts before the next read; assert by cache-key test.
- **B-06** Leaving succeeds when the caller is the current host.
- **B-07** No prompt-construction path can select a pause row, a tie value or a payment field; assert by unit test on the prompt builder's inputs.

For Designer/Frontend/Accessibility:

- **B-08** Leave completes in at most two activations from an ordinary surface, by mouse, keyboard and screen reader.
- **B-09** Cancel and Confirm have equal visual weight in every destructive confirmation.
- **B-10** Every graph state is conveyed by pattern and text, verified with color removed.
- **B-11** No screen shows a numeric closeness value, rank or warning icon attached to a person.
- **B-12** Reduced motion keeps both graph scenes reachable.

For QA (YT-028) and Demo (YT-034):

- **B-13** Negative-path suite includes: withdrawal-then-compute, pause-then-view-as-peer, host-leaves-mid-cycle, payment blocked, duplicate webhook, stale approval.
- **B-14** Demo script contains no unsourced behavioral claim and states that the graph people are fictional.

A single failure of B-01 through B-12 blocks the affected behavior; these are not averaged into a score.

## Conditions for a later sign-off (YT-030)

1. Real screens and code exist and are re-reviewed at a named revision — this document does not transfer to a changed implementation.
2. Q-002 and Q-006 are resolved by their owners, with Privacy and Legal decisions recorded.
3. Every notification string is jointly approved, or no notifications ship.
4. B-01 through B-14 pass with evidence attached.
5. The pitch's behavioral claims each map to `RESEARCH_NOTES.md` or are cut.

No sign-off is granted or implied by this review.
