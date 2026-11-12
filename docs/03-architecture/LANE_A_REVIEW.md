# Lane S review of the Lane A Phase 1 drafts (RV-002)

**Reviewer:** Architect (Lane S, Shaahid) · **Date:** November 12, 2026 · **Verdict: request changes**
**Scope:** `docs/01-product/PRD.md`, `USER_STORIES.md`, `METRICS.md`, `docs/02-design/{FLOWS,DESIGN_SYSTEM,VOICE_AND_TONE}.md`, `docs/04-behavioral/{PRINCIPLES,ETHICS_CHECKLIST,RESEARCH_NOTES,PHASE1_REVIEW}.md`
**Reference:** the contract as amended by ADR 0005 and RV-001 (`CROSS_REVIEW_RESPONSE.md`)

## Read this first: this is not an independent review

Every document in scope was produced by an agent session I dispatched or wrote myself. **I am an author of `USER_STORIES.md`, `FLOWS.md`, `DESIGN_SYSTEM.md`, `VOICE_AND_TONE.md` and `PHASE1_REVIEW.md`**, and `PRD.md` came from a subagent I briefed. Under RULES rule 19 and the Reviewer role ("has never authored the code it reviews"), none of that is independent, and labelling it so would be the same overclaim RV-001 caught me making elsewhere.

So this document is a **consistency audit by the contract owner**, which is a real and narrow kind of value: the contract changed under these documents twice — ADR 0005 replaced the money mechanism, and RV-001 added two gates and removed free text — and someone had to check what those changes broke. **Nine of the findings below are mechanically verified contradictions**, not matters of taste. It does not discharge touchpoint T4's independent-review requirement, which still needs a reviewer who authored none of it.

## Blockers: documents that now contradict the contract

These are not disagreements. The contract says one thing and the Lane A document says another, and a reader following the document would build the wrong product.

### LA-01 (blocker) · Four documents still describe the Orders money model that ADR 0005 removed

ADR 0005 established that the pot pays the venue by **Payouts**, because Orders is buyer-initiated and cannot spend funds a merchant already holds. The verified payment state enum is now `blocked, payout_pending, unverified, payout_success, payout_denied, failed`. Still stale:

| Location                       | Text                                                                                                  | Problem                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `FLOWS.md` L17, L54-ish (S-06) | "blocked, order created, payer approved, captured, failed, unverified/pending"                        | Three of six states do not exist                    |
| `DESIGN_SYSTEM.md` L71         | "Six distinct labelled states (blocked, order created, payer approved, captured, failed, unverified)" | Same; a designer would build three wrong chips      |
| `VOICE_AND_TONE.md` L61, L63   | Copy rows for "Order created / payer approved" and "Captured"                                         | Prescribes copy for states that cannot occur        |
| `USER_STORIES.md` L119         | "**Given** an Order, **then** created, payer-approved and captured are distinct"                      | An acceptance criterion that can never be satisfied |
| `PRD.md` L25                   | "revalidation alone may advance a future Order"                                                       | Wrong mechanism in the host-approval definition     |

The _intent_ behind all five is right and must survive: never show a provider step as a venue reservation. Only the state names change. Note `VOICE_AND_TONE.md` is additionally missing copy for `payout_denied`, which is the state a demo is most likely to hit.

### LA-02 (blocker) · `FLOWS.md` L54 shows peers a pause state the contract no longer exposes

FLOWS: "Peers see at most a neutral 'paused' word on S-02." Per XR-08 — Alan's own finding — whether peers see _any_ pause state is undecided, so the contract's peer view now lists accepted members only, with `participationStateVisibility: policy_pending`. S-02 as written cannot be built, and building it would pre-decide a Q-006 privacy question in the UI. The screen needs a `policy_pending` state instead.

### LA-03 (blocker) · `VOICE_AND_TONE.md` L30 and L41 mark as **allowed** the exact copy the graph gate forbids

Both documents hold up "Plan something Sam and Priya would both enjoy / love" as the model of good framing, and `FLOWS.md` L69 and `PRINCIPLES.md` L35 repeat it. Under XR-01 the real-member graph gate is closed: no tie- or drift-derived value is computed, and no guidance names a pair. Under XR-02 host copy comes from a closed `rationaleKey` vocabulary with no person-naming key.

This one matters beyond tidiness, because that sentence is **the demo's emotional payload** and it is currently unbuildable. Three honest options, and Behavioral plus Content should choose rather than Architecture: label it as copy that activates only if Q-002 opens the gate; restrict pair-naming to the clearly-labelled synthetic demo graph (S-08), where no real inference exists; or cut it. A fourth path — host-chosen framing, where the host names their own friends with no AI inference — may serve the same emotional beat with no gate dependency at all.

### LA-04 (blocker) · `ETHICS_CHECKLIST.md` L40 and `PRINCIPLES.md` L24 rely on a "skipped" turn state that no longer exists

Both say skipping carries no penalty and no shame. The contract removed `skipped` from `Turn.state` (XR-23), because a host-decline rule is undecided (D-P02) and a skip marker beside a named host risks reading as shame. The _principle_ is correct and should stay; the mechanism it names is gone, so the checklist item is currently unverifiable. It needs rewording against suspension, or an explicit "pending D-P02".

## Majors: traceability and verifiability gaps

### LA-05 (major) · `METRICS.md` has no metric identifiers

The file has a north star, guardrails, an event schema and a limitations section — good structure — but **no stable `M-xx` ids**, so no story, task or pitch claim can cite a specific metric, and nothing can be checked for drift later. Every other Lane A document uses stable ids (`US-`, `S-`, `E-`, `B-`). Metrics should too.

### LA-06 (major) · `METRICS.md` does not say that nothing is instrumented

The event schema reads as a description of what the system records. No analytics, event pipeline or instrumentation exists, and none is in Phase 2 scope. The file needs the same honesty the contract now carries about the metaschema: this is a **plan**, not a capability, and no metric in it has ever been measured.

### LA-07 (major) · PRD decision `D-P03` is absent from the board

`PRD.md` names four open product decisions. `D-P01`, `D-P02` and `D-P04` appear on the board; **`D-P03` appears nowhere outside the PRD and `USER_STORIES.md`**, so there is no task, owner or question that will ever force it. Symmetrically, `D-P04` is missing from `USER_STORIES.md`. This is the same class of defect as XR-29: a decision with no owner silently never gets made. The fix belongs on the board, which is mine — say the word and I will add it, since Lane A should not have to edit `tasks/`.

### LA-08 (major) · `PHASE1_REVIEW.md` never cites its own checklist

The behavioral review raises 14 findings (`B-01`–`B-14`) and references `ETHICS_CHECKLIST.md` ids (`E-01`–`E-08`) **zero times**, and `US-xx` once. The checklist is the gate every feature is supposed to pass, so a review that does not map to it cannot show coverage — there is no way to tell which of the eight hard rules were actually examined. All eight `E-` ids do resolve correctly where used elsewhere, so this is a coverage gap, not a broken reference.

### LA-09 (major) · `FLOWS.md` defines nine screens and no screen-to-story map

All 14 stories cite a screen, but no screen lists the stories it serves, so there is no way to check that every story has a home or that no screen exists without a story behind it. For a 3-day build this is the cheapest possible safeguard against building a screen nobody asked for.

## Minors

- **LA-10** · `RESEARCH_NOTES.md` carries three sources, one of which was reached through an archived copy after a 403, and the file says so — that honesty is right. But rule 8 (every behavioral claim in the pitch needs a source) means the **pitch** will need live-verifiable citations; an archived page is weak support under questioning. Worth re-fetching before Phase 4 rather than at the podium.
- **LA-11** · `PRD.md` L19 states the rotation order is deterministic and explicitly not ranked by closeness, payment or attendance. That is exactly right and now matches the contract; flagged only so it does not get "improved" later into an optimisation, which is also the first item on the cut list.
- **LA-12** · The non-AI path is mentioned in `FLOWS.md` but has no screen state on S-04 for "host declined suggestions". The contract now has `createManualPlan` (XR-11), so the flow can be completed; it just is not drawn.

## What Lane A got right, and should not be edited away

The `oneOf`-style honesty discipline runs through all of these documents and it is the reason RV-001 was possible: `FLOWS.md` enumerates loading, empty, error and refused states per screen instead of only the happy path; `S-09` treats an honest refusal as a designed screen; `USER_STORIES.md` L187 states plainly that money consequences are unresolved rather than inventing a policy; `PRINCIPLES.md` keeps SDT's three canonical needs separate from the product's own safeguards instead of blurring them into five invented ones. `ETHICS_CHECKLIST.md` turning eight prose rules into eight checkable items is what made XR-01 and XR-02 findable at all.

## Disposition

Nothing in this review edits a Lane A file. LA-01 through LA-04 are blockers because a contradiction between the contract and a design document will produce wrong code; they are also small, mostly find-and-replace of state names plus one genuine product decision (LA-03). LA-05 to LA-09 are traceability work.

**Owed from me:** `D-P03` on the board (LA-07) and a screen-to-story table if Lane A wants it in `tasks/` rather than `docs/02-design/`.
**Still unresolved and not touched here:** XR-09 — `USER_STORIES.md` US-002 says "without naming, **counting** or ranking" while `ETHICS_CHECKLIST.md` B-03 permits counts. Two Lane A baselines disagree and PM plus Behavioral must pick (RV-008).
**Independent review of these documents remains owed by someone who authored none of them.**
