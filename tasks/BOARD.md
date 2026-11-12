# YourTurn task board

Single source of task state. **Phase 1 documentation authorized** by the human request "go for phase 1" on November 11, 2026. Product implementation, payment execution and final contract freeze are NOT authorized by that request. See STATUS.md and HANDOFF.md. `∥` marks tasks that can run in parallel **after their dependencies and phase gate clear**, not tasks ready now. Completed local artifacts stay IN REVIEW until the global DoD, including hosted CI and independent review, passes. No task is falsely marked DONE.

**Phase release, November 12, 2026 (human: Rohan):** Phase 1 and Phase 2 are released for Rohan's Lane S stories only: US-001, US-002, US-004, US-007, US-008, US-013 and US-015. This release covers contract and backend implementation for those stories. It does not open the payment gate, authorize live money, freeze the contract, or release any other person's tasks.

The user requested initial scaffold creation across the tree. Orchestrator coordinated Architect/SRE/Tech Writer/Behavioral roles for that one-time bootstrap; this grants no ongoing cross-path access. Bootstrap commit `10bc1d7` is now on private GitHub `shaahid-ahmed/yourturn` main following explicit human approval; CI run `43058134382` succeeded. Current integration branch: `orchestrator/phase-1-contracts`. Claim/handoff/question edits to your own row are the limited collaboration exception in ROSTER.md. New claims on separate machines require shared-board/coordinator acknowledgement.

## TODO

| ID     | Title                                                                       | Role                 | Depends on                                                     | Acceptance criteria                                                                                                                                                                                                                                                                                                                                                                    | Claimed by                        | Branch/PR |
| ------ | --------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | --------- |
| YT-014 | RETIRED (ADR 0006) — Phase 1: reconcile and freeze contracts                | architect            | YT-008, YT-009, YT-010, YT-011, YT-012, YT-013, YT-024, YT-025 | Retired: superseded by UN-001 (Unspoken contract freeze). Original criteria: Reconcile PRD/design/research, approve API/data model and generation schema via ADR; resolve blocking questions with owners; human money-flow approval recorded                                                                                                                                           | ARCHIVED (ADR 0007) — was Shaahid | —         |
| YT-015 | RETIRED (ADR 0006) — ∥ Phase 2: circles, membership and host rotation       | backend              | YT-014                                                         | Retired: circles/host rotation do not exist in Unspoken → UN-002. Original criteria: TDD API/persistence; 3–6 members; deterministic rotation; join/leave/pause/authz cases; docs match contract                                                                                                                                                                                       | ARCHIVED (ADR 0007) — was Shaahid | —         |
| YT-016 | Phase 2: ledger and verified webhook ingress                                | backend              | YT-015, YT-023, YT-025                                         | Integer cents, atomic derived balance, verified ingress before effects, replay/out-of-order/concurrency tests; money branches 100%                                                                                                                                                                                                                                                     | ARCHIVED (ADR 0007) — was Shaahid | —         |
| YT-017 | RETIRED (ADR 0006) — ∥ Phase 2: PayPal sandbox integration                  | payments             | YT-014, YT-023, YT-025, YT-006                                 | Retired: subscriptions + Payouts replaced by per-member authorize/capture/void → UN-004. Original criteria: Subscriptions, Orders/capture, verification helpers, deterministic host approval and reconciliation; provider readback; money branches 100%; approved flow only                                                                                                            | ARCHIVED (ADR 0007) — was Shaahid | —         |
| YT-018 | ∥ Phase 2: histories, venues, event schema and metrics                      | data-analytics       | YT-014, YT-024                                                 | Synthetic Sam/Priya fading history, fixed venues, repeatable seed, metric guardrails and no real personal data                                                                                                                                                                                                                                                                         | Human: Alan — Unclaimed           | —         |
| YT-019 | RETIRED (ADR 0006) — Phase 2: tie strength and drift heuristics             | ml-engineer          | YT-018, YT-024                                                 | Retired: tie strength and drift removed from the product entirely (ADR 0006). Original criteria: Consented-input policy, bounded 0–1 internal scoring, deterministic evals incl. missingness/withdrawal; no accuracy claims; results to Architect                                                                                                                                      | Human: Alan — Unclaimed           | —         |
| YT-020 | RETIRED (ADR 0006) — Phase 2: three-plan host copilot                       | llm-engineer         | YT-018, YT-024                                                 | Retired: host copilot replaced by coordinator + per-member feasibility → UN-005/UN-006. Original criteria: Schema-valid exactly-three-plan JSON; bounded retry, budget/venue checks, minimized prompts, no payment tools; evals recorded                                                                                                                                               | Human: Alan — Unclaimed           | —         |
| YT-021 | ∥ Phase 2: frontend against approved contract mocks                         | frontend             | YT-014                                                         | Screens against contract fixtures; host approval, pause/exit/consent, accessible states; no fake live-payment claims                                                                                                                                                                                                                                                                   | Human: Alan — Unclaimed           | —         |
| YT-022 | RETIRED (ADR 0006) — Phase 2: integrate real API, copilot and graph         | frontend             | YT-016, YT-017, YT-019, YT-020, YT-021                         | Retired: no graph to integrate → UN-008. Original criteria: Full approved path; synthetic graph labelled; distinct failure/pending/success; no claim of booking from capture alone                                                                                                                                                                                                     | ARCHIVED (ADR 0007) — was Shaahid | —         |
| YT-023 | ∥ Phase 2: security threat/control review                                   | security             | YT-014                                                         | Authz, tenant leakage, webhook verification/replay, secret exposure and prompt injection mapped to owner tests                                                                                                                                                                                                                                                                         | ARCHIVED (ADR 0007) — was Shaahid | —         |
| YT-024 | RETIRED (ADR 0006) — ∥ Phase 2: privacy and graph visibility decision       | privacy              | YT-010, YT-011; runs BEFORE the freeze (XR-29)                 | Retired: graph visibility decision is moot, Q-002 closed. Original criteria: Minimized inventory, consent/withdrawal/deletion, third-party access, confidential hardship; Q-002 resolution with Behavioral/Designer/human                                                                                                                                                              | Human: Alan — Unclaimed           | —         |
| YT-025 | ∥ Phase 2: legal/compliance risk assessment                                 | legal-compliance     | YT-006 evidence; runs BEFORE the freeze (XR-29)                | Sourced review of actual flow, pooled funds, PayPal terms, forfeit/cancellation/refund and gambling-adjacent questions; unresolved risks block flow                                                                                                                                                                                                                                    | ARCHIVED (ADR 0007) — was Shaahid | —         |
| YT-026 | ∥ Phase 2: abuse and coercion assessment                                    | trust-safety         | YT-014                                                         | Host misuse, exclusion, harassment, financial coercion and safe exit scenarios with mitigation/test owners                                                                                                                                                                                                                                                                             | Human: Alan — Unclaimed           | —         |
| YT-027 | ∥ Phase 2: market and positioning                                           | growth-market        | YT-014                                                         | Dated primary sources, sourced sizing and competitor comparisons; ethical revenue hypotheses; no invented traction                                                                                                                                                                                                                                                                     | Human: Alan — Unclaimed           | —         |
| YT-028 | Phase 3: demo e2e and negative-path suite                                   | qa                   | YT-022, YT-026                                                 | Real sandbox path with evidence plus failed payment, duplicate webhook, stale host, leave/pause/consent cases; no mocks counted as sandbox proof                                                                                                                                                                                                                                       | ARCHIVED (ADR 0007) — was Shaahid | —         |
| YT-029 | ∥ Phase 3: accessibility audit and scoped fixes                             | accessibility        | YT-022                                                         | WCAG 2.2 AA criterion evidence; keyboard/screen-reader/reduced-motion checks and graph non-color alternative; retest fixes                                                                                                                                                                                                                                                             | Human: Alan — Unclaimed           | —         |
| YT-030 | ∥ Phase 3: behavioral release review                                        | behavioral-scientist | YT-022, YT-024, YT-026                                         | Revision-bound checklist/sign-off; notifications dual-approved; no real public scores, shame or coercion                                                                                                                                                                                                                                                                               | Human: Alan — Unclaimed           | —         |
| YT-031 | Phase 3: independent integration review                                     | reviewer             | YT-028, YT-029, YT-030                                         | Non-author review, green CI, money branch coverage and AI eval evidence; security/risk blockers resolved; comments only                                                                                                                                                                                                                                                                | ARCHIVED (ADR 0007) — was Shaahid | —         |
| YT-032 | Phase 3: approved sandbox demo deployment                                   | sre-devops           | YT-031; human deployment approval                              | Approved environment only, secrets isolated, health/reset/recovery verified; no production money or unapproved billable resources                                                                                                                                                                                                                                                      | ARCHIVED (ADR 0007) — was Shaahid | —         |
| YT-033 | RETIRED (ADR 0006) — Phase 4: synthetic graph animation polish              | frontend             | YT-031                                                         | Retired: red-to-green graph animation removed from the demo → UN-012. Original criteria: Labelled synthetic red-to-green change, text/icon signal and reduced motion; no new product scope; review again after changes                                                                                                                                                                 | Human: Alan — Unclaimed           | —         |
| YT-034 | ∥ Phase 4: pitch, slides and demo script                                    | demo-pitch           | YT-027, YT-031                                                 | Sourced claims, three-minute script, slide/video storyboard, honest payment/fallback labels and failure path                                                                                                                                                                                                                                                                           | Human: Alan — Unclaimed           | —         |
| YT-035 | ∥ Phase 4: README and handoff refresh                                       | tech-writer          | YT-032                                                         | Fresh-clone instructions exercised, actual demo link, Legal-approved disclaimer and exact limitations; no scaffold-as-product claims                                                                                                                                                                                                                                                   | ARCHIVED (ADR 0007) — was Shaahid | —         |
| YT-036 | Phase 4: rehearsal and recorded backup                                      | demo-pitch           | YT-032, YT-033, YT-034, YT-035                                 | Rehearsal measured under three minutes; backup recording produced and played back; no real personal/secret data                                                                                                                                                                                                                                                                        | ARCHIVED (ADR 0007) — was Shaahid | —         |
| YT-037 | Phase 4: final independent review                                           | reviewer             | YT-036                                                         | Review exact final revision including post-hardening polish/docs; green CI, specialist sign-offs and no unresolved release blockers                                                                                                                                                                                                                                                    | ARCHIVED (ADR 0007) — was Shaahid | —         |
| YT-038 | Phase 4: final human build approval                                         | orchestrator         | YT-037                                                         | Human approves exact demo revision and any main merge; preserve evidence and handoffs; no silent release                                                                                                                                                                                                                                                                               | ARCHIVED (ADR 0007) — was Shaahid | —         |
| UN-001 | Phase 1: Unspoken contract — API, schema, state machine                     | architect            | Q-008                                                          | openapi.json rewritten for groups/hangouts/candidates/commitments/ledger; hangout state machine per ADR 0006; no pot, turn, tie or drift schema remains; contract tests replace the YourTurn suite                                                                                                                                                                                     | ARCHIVED (ADR 0007) — was Shaahid | —         |
| UN-002 | ∥ Phase 2: groups, membership and hangout lifecycle                         | backend              | UN-001                                                         | TDD; 3–8 members enforced; hangout state machine with transactional transitions and an outbox; decline is private; progress exposed as a count only                                                                                                                                                                                                                                    | ARCHIVED (ADR 0007) — was Shaahid | —         |
| UN-003 | Phase 2: constraint vault and per-member isolation                          | backend              | UN-001                                                         | Per-user encrypted vault entry; only that member may read their own constraints; no API returns another member constraint; authz tests prove it                                                                                                                                                                                                                                        | ARCHIVED (ADR 0007) — was Shaahid | —         |
| UN-004 | Phase 2: authorize, capture, void and refund                                | payments             | UN-001, UN-002, Q-008                                          | Per-member orders with venue as payee; all-or-nothing capture; void on decline/deadline; refund path on partial capture failure; idempotency keyed to target and body; deadline below the honor period; money branches 100%                                                                                                                                                            | ARCHIVED (ADR 0007) — was Shaahid | —         |
| UN-005 | ∥ Phase 2: coordinator candidate generation                                 | llm-engineer         | UN-001, UN-007                                                 | Schema-valid candidates from the venue catalog only; prices never model-authored; diversity rule enforced including one free or near-free option; evals recorded                                                                                                                                                                                                                       | Human: Alan — Unclaimed           | —         |
| UN-006 | ∥ Phase 2: personal agent constraint extraction and evaluation              | llm-engineer         | UN-001, UN-003                                                 | Hard rules in plain code and property-tested so an accepted plan never breaks one; LLM affects ranking only; extraction accuracy measured on hand-written statements; red-team prompts leak zero constraints                                                                                                                                                                           | Human: Alan — Unclaimed           | —         |
| UN-007 | ∥ Phase 2: venue catalog, seeded groups and fixtures                        | data-analytics       | UN-001                                                         | Fixture venues with price bands, hours and tags; seeded demo group of four with varied private budgets; all fixtures visibly synthetic                                                                                                                                                                                                                                                 | Human: Alan — Unclaimed           | —         |
| UN-008 | Phase 2: phone-first frontend — private agent chat, group view, commit flow | frontend             | UN-001, UN-013                                                 | Mobile viewport is the design target (360–430 CSS px), single column, thumb-reachable primary actions, 44px minimum touch targets, no hover-only affordance; own-constraints screen visible only to its owner; group view shows the winner and a count, never names or rejected candidates; held/captured/voided states labelled honestly                                              | Human: Alan — Unclaimed           | —         |
| UN-009 | ∥ Phase 2: tally privacy boundary and retention                             | privacy              | UN-001                                                         | Per-member answers held in memory only, never persisted or logged; documented as architectural not cryptographic privacy; inference-over-rounds risk written down                                                                                                                                                                                                                      | Human: Alan — Unclaimed           | —         |
| UN-010 | Phase 3: e2e of the all-or-nothing path and its failures                    | qa                   | UN-004, UN-008                                                 | Happy path plus: one member declines, deadline expires, a capture fails after others succeed, a duplicate webhook, a reused idempotency key                                                                                                                                                                                                                                            | ARCHIVED (ADR 0007) — was Shaahid | —         |
| UN-011 | Phase 3: independent review of the Unspoken contract and money path         | reviewer             | UN-004, UN-010                                                 | Reviewer authored none of what they review; both lanes covered; findings recorded with owners                                                                                                                                                                                                                                                                                          | ARCHIVED (ADR 0007) — was Shaahid | —         |
| UN-012 | Phase 4: demo — four holds, one capture, and the void replay                | demo-pitch           | UN-010                                                         | Under three minutes; the void replay shows no names; a recorded backup exists; every privacy claim in the pitch is the architectural one, not a cryptographic one                                                                                                                                                                                                                      | Human: Alan — Unclaimed           | —         |
| UN-013 | ∥ Phase 1: phone-first design system and flows                              | product-designer     | UN-001                                                         | Mobile-first tokens, type scale and spacing; flows drawn at a phone width for onboarding, group view, the approve-your-share step and the void/"didn't come together" state; every screen specifies loading, empty, error and refused; WCAG 2.2 AA touch-target and contrast rules stated                                                                                              | Human: Alan — Unclaimed           | —         |
| UN-014 | Phase 2: public HTTPS tunnel and return/cancel URLs for device testing      | sre-devops           | UN-004                                                         | A phone cannot reach 127.0.0.1: PayPal approval leaves the browser and returns via return_url, so a public HTTPS return/cancel pair is required to approve a share on a handset. Tunnel or hosted origin documented, URLs configurable per environment, and the same origin reused for the webhook listener (which also needs public HTTPS). A return-URL hit remains proof of nothing | ARCHIVED (ADR 0007) — was Shaahid | —         |
| US-006 | ∥ Phase 2: member-to-member PayPal settlement                               | payments             | US-005, Q-010                                                  | Sandbox payment between two personal accounts; verified webhook before any effect; idempotency bound to target and body; failure returns to owed; gate closed                                                                                                                                                                                                                          | Human: Alan — Unclaimed           | —         |

Rows RV-002–RV-011 are review findings for the owners, not new product scope. They use the `RV-` prefix because `tests/repository.test.mjs` pins the task count at 42 YT rows. Orchestrator may renumber them as YT rows and update that test (Lane S).

**Disposition update (reviewer kiro-lane-a-xr1, Nov 12):** PR #4 (`architect/xr-fixes`, RV-001 response) resolved RV-002 through RV-006 at the contract level and re-sequenced RV-007 (XR-29 deadlock). I independently reviewed PR #4 and verified each fix against the spec — see `docs/04-behavioral/PR4_REVIEW_RV001_RESPONSE.md`; verdict **approve the contract fixes, two corrections requested** (RV-010, RV-011). RV-008 and RV-009 remain open Lane A / Privacy decisions; the architect's deferrals match their owners. RV-002–RV-006 should move to DONE once PR #4 merges to `main` with green hosted CI (they are not on `main` yet).

| ID     | Title                                                      | Role                                                                      | Depends on                | Acceptance criteria                                                                                                                                                                                                                                                                                                                                                                  | Claimed by                                                  | Branch/PR |
| ------ | ---------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | --------- |
| RV-002 | Gate real-member inference; define host-guidance channel   | architect                                                                 | RV-001; Q-002 decision    | XR-01, XR-02: real-member graph computation gated closed until Q-002; no tie- or pair-derived prompt input while closed; rationale template or closed vocabulary; B-07 covers pair identities; ADR 0004 updated                                                                                                                                                                      | ARCHIVED (ADR 0007) — was Shaahid                           | —         |
| RV-003 | Ledger provenance, synthetic separation and idempotency    | architect, payments                                                       | RV-001                    | XR-03, XR-04, XR-05, XR-21: synthetic money never in payment budget checks; non-synthetic rows require verified event; correction authority by ADR plus human gate; pot sign rule; key binds target and body                                                                                                                                                                         | ARCHIVED (ADR 0007) — was Shaahid                           | —         |
| RV-004 | Payment-gate preconditions and non-loopback identity       | architect, security                                                       | RV-001                    | XR-06, XR-20: gate conditions and `blockingTasks` include Q-006 and YT-025; identity model is a precondition for YT-032 and gate opening; risks mapped in YT-023                                                                                                                                                                                                                     | ARCHIVED (ADR 0007) — was Shaahid                           | —         |
| RV-005 | Membership, pause, rotation and approval state model       | architect                                                                 | RV-001; Q-006 where noted | XR-07, XR-08, XR-10, XR-18, XR-22, XR-23, XR-24: one pause representation; cap/agreement/version effects defined or `policy_pending`; full stale triggers and one status code; not-ready on approve/pay                                                                                                                                                                              | ARCHIVED (ADR 0007) — was Shaahid                           | —         |
| RV-006 | Missing operations, states and field constraints           | architect                                                                 | RV-001                    | XR-11–XR-15, XR-19, XR-25, XR-26 and US-004 `potLabel`: manual plan route; server budget; constrained prompt fields; unverified payment state; complete authz matrix; operator and decline routes                                                                                                                                                                                    | ARCHIVED (ADR 0007) — was Shaahid                           | —         |
| RV-007 | Correct status claims, T1 and freeze sequencing            | orchestrator, architect                                                   | RV-001                    | XR-27, XR-28, XR-29: 23-operation count; ADR verification marked unmet; D-P01 test pin noted; T1 aligned with API.md; no notification emission stated; YT-024/YT-025 decision work sequenced before freeze                                                                                                                                                                           | ARCHIVED (ADR 0007) — was Shaahid                           | —         |
| RV-008 | Reconcile US-002 counting with B-03; revisit rule 1 rating | product-manager, behavioral-scientist                                     | RV-001                    | XR-09, XR-01: decide whether agreement counts are allowed and fix USER_STORIES or PHASE1_REVIEW to match; small-circle inference addressed; PHASE1_REVIEW rule 1 re-rated against real-member inference                                                                                                                                                                              | Human: Alan — Unclaimed                                     | —         |
| RV-009 | Privacy decisions: prospective consent and peer visibility | privacy                                                                   | RV-001; Q-002, Q-006      | XR-08, XR-16, XR-17, XR-22: decide prospective vs retroactive consent, consent history, peer visibility of paused/invited/left members and plan invalidation on withdrawal; record in PRIVACY.md                                                                                                                                                                                     | Human: Alan — DONE, branch privacy/rv-009-privacy-decisions | —         |
| RV-010 | Correct Q-001/Q-004 board wording to match the evidence    | payments, orchestrator                                                    | RV-001 (PR #4 review)     | RC-1: Q-001 is not fully "ANSWERED" and Q-004 not "MOOT" — the outbound payout is verified but the inbound leg is `APPROVAL_PENDING` and the webhook is blocked. Reword both to "mechanism verified, end-to-end not demonstrated" per `PR4_REVIEW_RV001_RESPONSE.md`                                                                                                                 | ARCHIVED (ADR 0007) — was Shaahid                           | —         |
| RV-011 | Record the PR #2 money-flow / main-merge decision          | orchestrator                                                              | RV-001 (PR #4 review)     | RC-2: PR #2 changed the money mechanism (Orders→Payouts, Payouts into core scope) and merged to `main`; RULES 24 gates both on human approval. Human records on the board whether the Payouts direction is approved (gate still closed) or merged as documentation with the decision pending                                                                                         | ARCHIVED (ADR 0007) — was Shaahid                           | —         |
| RV-012 | Fix Lane A docs that now contradict the contract (RV-002)  | product-designer, content-designer, product-manager, behavioral-scientist | PR #4; RV-002             | LA-01–LA-12 from `docs/03-architecture/LANE_A_REVIEW.md`: replace Orders-era payment states with Payouts states in FLOWS/DESIGN_SYSTEM/VOICE_AND_TONE/USER_STORIES/PRD; S-02 pause → `policy_pending`; remove graph-gate-forbidden pair copy; reword `skipped`→suspension; add `M-xx` ids + "nothing instrumented" to METRICS; add screen↔story map. All Lane A paths, owned by Alan | Human: Alan — Unclaimed                                     | —         |

## IN PROGRESS

| ID  | Title | Role | Depends on | Acceptance criteria | Claimed by | Branch/PR |
| --- | ----- | ---- | ---------- | ------------------- | ---------- | --------- |

| US-019 | Phase 2: HTTP routes for the contract | backend | US-001, US-002, US-013, YT-007 (stack ratification) | Every openapi.json operation is served under /api/v1; requests and responses are validated against the contract; errors match the contract Error / PaymentGateError shapes; createSettlementPayment stays gated closed (409 payment_gate_blocked) | Human: Shaahid — IN PROGRESS | — |
| US-301 | ∥ Phase 1: test plan and fixtures | qa | US-001 | Seeded pods, members, venues, events; every fixture visibly synthetic; no real personal data | Human: Shaahid — IN PROGRESS | — |
| US-302 | ∥ Phase 2: E2E of the happy path | qa | US-103, US-104, US-005, US-006 | Onboarding to settlement, each step asserted | Human: Shaahid — IN PROGRESS | — |
| US-303 | Phase 3: failure and negative paths | qa | US-302 | No plan fits, nobody votes, nobody says yes, booking fails, payment fails, yes-then-leave, duplicate webhook | Human: Shaahid — IN PROGRESS | — |
| US-304 | Phase 4: demo script and rehearsal | demo-pitch | US-302, US-202 | Under three minutes; honest labels; recorded backup | Human: Shaahid — IN PROGRESS | — |
| US-305 | Phase 4: final QA and regression pass | qa | US-303, US-016, US-204 | Full suite green on CI; no unresolved release blocker | Human: Shaahid — IN PROGRESS | — |

## IN REVIEW

Vid's reassigned backend tasks awaiting independent review (Rohan reviews, per the Lane S reassignment):

| ID  | Title | Role | Depends on | Acceptance criteria | Claimed by | Branch/PR |
| --- | ----- | ---- | ---------- | ------------------- | ---------- | --------- |

Lane V design work awaiting independent review:

| ID     | Title                        | Role          | Depends on | Acceptance criteria                                | Claimed by                                                                                                                                  | Branch/PR                                            |
| ------ | ---------------------------- | ------------- | ---------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| US-204 | Phase 3: accessibility audit | accessibility | US-202     | WCAG 2.2 AA evidence; colour never the only signal | Human: Vid — IN REVIEW (accessibility, claude-opus-5-5) 2026-11-12: design and app-stage audits done; device screen-reader pass outstanding | `accessibility/us-204-app-audit` (design stage: #49) |

| ID     | Title                                              | Role                 | Depends on                                                                                                                        | Acceptance criteria                                                                                                      | Claimed by                                            | Branch/PR                      |
| ------ | -------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------ |
| YT-008 | ∥ Phase 1: PRD, stories and metric intent          | product-manager      | YT-001, YT-002, YT-003, YT-004, YT-005; explicit human Phase 1 document authorization                                             | PRD scope, testable stories, consent/exit/pause criteria and metric intent for Data; reconcile in YT-014                 | Human: Alan — product-manager, phase1-product         | orchestrator/phase-1-contracts |
| YT-009 | ∥ Phase 1: draft API, schema and architecture      | architect            | YT-001, YT-002, YT-003, YT-004, YT-005; explicit human Phase 1 document authorization                                             | Contract-first draft, authz, ledger/rotation/consent invariants and shared-type generation plan; reconcile PRD in YT-014 | Human: Shaahid — architect, phase1-architect          | orchestrator/phase-1-contracts |
| YT-010 | ∥ Phase 1: review behavioral baseline and gates    | behavioral-scientist | YT-001, YT-002, YT-003, YT-004, YT-005; explicit human Phase 1 document authorization                                             | Review all eight rules, claim register and gate process; document decisions, not assumed sign-off                        | Human: Alan — behavioral-scientist, phase1-behavioral | orchestrator/phase-1-contracts |
| YT-011 | ∥ Phase 1: flows and design system                 | product-designer     | YT-001, YT-002, YT-003, YT-004, YT-005; explicit human Phase 1 document authorization                                             | Draft onboarding, host approval, private pause, two-tap exit and synthetic graph; non-color cues; reconcile in YT-014    | Human: Alan — product-designer, phase1-design         | orchestrator/phase-1-contracts |
| YT-012 | ∥ Phase 1: consented UX research plan and findings | ux-researcher        | YT-001, YT-002, YT-003, YT-004, YT-005; explicit human Phase 1 document authorization; research plan only, no participant contact | Research section only; real interviews if approved, otherwise clearly untested hypotheses; no invented participants      | Human: Alan — ux-researcher, phase1-product           | orchestrator/phase-1-contracts |
| YT-013 | Phase 1: voice, disclosure and notification copy   | content-designer     | YT-008, YT-010, YT-011                                                                                                            | No guilt copy; strings and notifications jointly reviewed with Behavioral; claims correctly qualified                    | Human: Alan — content-designer, phase1-content        | orchestrator/phase-1-contracts |

**Rohan's Lane S stack (status November 12, 2026):** US-001 #56 → US-002 #57 → US-004 #58 → US-007 #59 → US-008 #60 → US-013 #61 → US-015 #62 (BLOCKED, partial). They must merge in that order. Each PR is based on the one before, so its diff shows only its own story. Hosted CI is green on #56–#61. None has an independent Reviewer approval yet (Vid or Alan; the author cannot approve). Behavioral Scientist sign-off is also needed on #56, #57, #58, #60 and #61, and human merge approval on all. No HTTP routes exist yet. US-019 (HTTP routes, Rohan) is in TODO and will stack on #61, not #62. It waits on ratifying ADR 0002 (Fastify), which is a YT-007 human release-gate item held by Shaahid. Either Shaahid ratifies, or Orchestrator reassigns YT-007 after checking with him. ADR 0008 (contract-driven validation) is written only after that.

RV-001 waits here because only Orchestrator moves a task to DONE. Its verdict on the YT-009 drafts is **request changes**, so YT-009 also stays IN REVIEW.

| ID     | Title                                              | Role     | Depends on                                   | Acceptance criteria                                                                                                                                                                                                                        | Claimed by                              | Branch/PR                                    |
| ------ | -------------------------------------------------- | -------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | -------------------------------------------- |
| RV-001 | Phase 1: T4 cross-review of Lane S contract drafts | reviewer | YT-009 (IN REVIEW); YT-008 and YT-010 inputs | Review API.md, openapi.json, DATA_MODEL.md, ARCHITECTURE.md and ADR 0004 against USER_STORIES US-001–US-014 and PHASE1_REVIEW B-01–B-14; file contradictions, missing criteria and safety gaps as comments and owner rows; no Lane S edits | Human: Alan — reviewer, kiro-lane-a-xr1 | reviewer/phase1-contract-review (local only) |

## DONE

| ID     | Title                                   | Role                 | Depends on                                                     | Acceptance criteria                                                                                                                                                            | Claimed by                                               | Branch/PR                      |
| ------ | --------------------------------------- | -------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------ |
| YT-006 | Phase 0: PayPal sandbox go/no-go        | payments             | Human-supplied sandbox credentials (received)                  | Payouts venue payment verified by readback: batch CLAPZR33X2P32 SUCCESS, fee recorded, ADR 0005. Subscription payer approval and webhook verification carried to YT-017/YT-032 | Human: Shaahid — payments, hermes-parent                 | payments/adr-0005-payouts      |
| YT-001 | Phase 0: repository, rules and board    | orchestrator         | None; user bootstrap authorization                             | All required files, complete governance/context, phase board and day-0 status; no product features; bootstrap commit                                                           | Human: Shaahid — orchestrator, hermes-parent             | main @ 10bc1d7; CI 43058134382 |
| YT-002 | ∥ Phase 0: architecture and stack ADRs  | architect            | None; user bootstrap authorization                             | ADR 0001/0002 recorded before tooling implementation; provisional choices not fabricated human approval                                                                        | Human: Shaahid — architect, hermes-parent                | main @ 10bc1d7; CI 43058134382 |
| YT-003 | ∥ Phase 0: tooling and CI               | sre-devops           | YT-002 selection recorded; setup work may precede ratification | Locked install, setup-only dev, seed, lint, strict typing, tests and secret scan; CI workflow; hosted run succeeded                                                            | Human: Shaahid — sre-devops, hermes-parent               | main @ 10bc1d7; CI 43058134382 |
| YT-004 | ∥ Phase 0: onboarding, roles and roster | tech-writer          | None; user bootstrap authorization                             | All 24 exact role files, eight sections each, specific ownership/handoffs; onboarding commands exercised                                                                       | Human: Shaahid — tech-writer, bootstrap-roles            | main @ 10bc1d7; CI 43058134382 |
| YT-005 | ∥ Phase 0: behavioral baseline          | behavioral-scientist | None; user bootstrap authorization                             | Complete principles/checklist/research; eight rules preserved; sources and claims bounded; no implied product sign-off                                                         | Human: Alan — behavioral-scientist, bootstrap-behavioral | main @ 10bc1d7; CI 43058134382 |

Bootstrap artifact tasks closed on verified review, hosted CI and human main promotion. This does not close YT-006 or the residual YT-007 readiness gate.

| US-005 | ∥ Phase 2: IOU ledger and balances | payments | US-001, US-002 | Balances derived only; split sums exactly with rotating remainder; owed/pending/paid/failed; 100% branch coverage | Human: Alan — DONE, merged #51 | [#51](https://github.com/shaahid-ahmed/yourturn/pull/51) `payments/iou-ledger` |
| US-009 | ∥ Phase 2: private budget checks and stretch asks | llm-engineer | US-001, US-002 | Feasible/not-feasible only; stretch ask to that member only; group never sees the ask | Human: Alan — DONE, merged #52 | [#52](https://github.com/shaahid-ahmed/yourturn/pull/52) `llm-engineer/budget-checks` |
| US-010 | ∥ Phase 2: NYC events catalog | data-analytics | US-001 | Seeded catalog, search and filters, detail, suggest-to-pod; every fixture visibly synthetic | Human: Alan — DONE, merged #50 | [#50](https://github.com/shaahid-ahmed/yourturn/pull/50) `data-analytics/nyc-catalog` |
| US-101 | ∥ Phase 1: entry and onboarding P1–P4 | frontend | US-001 | Splash, phone sign-in, $15 subscription, six-step profile; private limits behind the lock badge; all editable later | Human: Alan — DONE, merged #53 | [#53](https://github.com/shaahid-ahmed/yourturn/pull/53) `frontend/mobile-screens` |
| US-102 | ∥ Phase 1: home and pods P5–P6 | frontend | US-001, US-004 | Floating bubbles with a stage cue that never names a member; create from contacts or invite link; empty state | Human: Alan — DONE, merged #53 | [#53](https://github.com/shaahid-ahmed/yourturn/pull/53) `frontend/mobile-screens` |
| US-103 | Phase 2: pod chat and planning P7–P12 | frontend | US-101, US-102, US-007, US-008, US-012 | Planner inside the chat; shortlist, time poll, ready check, booking confirmation as cards; votes visible with names | Human: Alan — DONE, merged #53 | [#53](https://github.com/shaahid-ahmed/yourturn/pull/53) `frontend/mobile-screens` |
| US-104 | Phase 2: money screens P13–P15, P23 | frontend | US-103, US-005, US-006 | Payer and split, settle up, money page; rating goes only to the member's own planner | Human: Alan — DONE, merged #53 | [#53](https://github.com/shaahid-ahmed/yourturn/pull/53) `frontend/mobile-screens` |
| US-105 | ∥ Phase 2: hub P16–P22 | frontend | US-101, US-010, US-011 | Events, calendar, profile, settings, payment methods, private planner chat with stretch cards | Human: Alan — DONE, merged #53 | [#53](https://github.com/shaahid-ahmed/yourturn/pull/53) `frontend/mobile-screens` |
| US-106 | ∥ Phase 2: constraint extraction and coordinator | llm-engineer | US-001, US-009 | Closed vocabulary, schema validation, bounded retry then rules fallback; red-team leaks zero constraints; evals recorded | Human: Alan — DONE, merged #54 | [#54](https://github.com/shaahid-ahmed/yourturn/pull/54) `llm-engineer/constraint-extraction` |
| US-107 | Phase 3: behavioral and trust review | behavioral-scientist | US-101, US-102, US-103, US-104, US-105 | Sign-off against the eight ethical rules; notification copy approved; no shame or coercion | Human: Alan — DONE, merged #55 | [#55](https://github.com/shaahid-ahmed/yourturn/pull/55) `behavioral-scientist/trust-review` |
| US-201 | ∥ Phase 1: design system and tokens | product-designer | US-001 | Phone-first tokens at 360–430 CSS px; PayPal blue as line art only | Human: Vid — DONE, merged #46 | [#46](https://github.com/shaahid-ahmed/yourturn/pull/46) |
| US-202 | ∥ Phase 1: all 23 screens to spec | product-designer | US-201 | Every screen from the page map including loading/empty/error/refused; no hover-only affordance; 44px touch targets | Human: Vid — DONE, merged #47 | [#47](https://github.com/shaahid-ahmed/yourturn/pull/47) |
| US-203 | ∥ Phase 2: motion and reduced motion | product-designer | US-202 | Logo turn, bubble drift, card arrival, booking pop, balance thread; reduced-motion equivalent for each | Human: Vid — DONE, merged #48 | [#48](https://github.com/shaahid-ahmed/yourturn/pull/48) |
| US-001 | Phase 1: API contract and data model for the UX-spec flow | architect | ADR 0007 | openapi.json rewritten for pods/chat/polls/hangout/balances/payments/calendar/subscriptions; old hold-capture-void operations removed; new state list; contract tests replace the retired suite | Human: Rohan — DONE, merged #56 | [#56](https://github.com/shaahid-ahmed/yourturn/pull/56) |
| US-002 | ∥ Phase 1: durable schema and state machine | backend | US-001 | Pods, membership, invites, messages, votes, hangout states, balances, payments, calendar links, receipts; append-only ledger; no stored balance; migration test on a scratch SQLite file | Human: Rohan — DONE, merged #57 | [#57](https://github.com/shaahid-ahmed/yourturn/pull/57) |
| US-004 | ∥ Phase 1: pods, invites and contact matching | backend | US-001 | 3–8 enforced; single-use invite links; phone matching; declined contacts leaves invite links only | Human: Rohan — DONE, merged #58 | [#58](https://github.com/shaahid-ahmed/yourturn/pull/58) |
| US-007 | ∥ Phase 2: pod chat and real-time delivery | backend | US-001, US-002 | Message storage, pagination, push, structured planner cards; no cross-pod content | Human: Rohan — DONE, merged #59 | [#59](https://github.com/shaahid-ahmed/yourturn/pull/59) |
| US-008 | ∥ Phase 2: polls and ready check | backend | US-001, US-002 | Shortlist, time poll, ready check; votes visible with names; tie on cost then start; closing and reminder jobs | Human: Rohan — DONE, merged #60 | [#60](https://github.com/shaahid-ahmed/yourturn/pull/60) |
| US-013 | ∥ Phase 2: notifications and push | backend | US-001, US-007 | Per-type switches; private reminders never in pod chat; no send without Content + Behavioral approval | Human: Rohan — DONE, merged #61 | [#61](https://github.com/shaahid-ahmed/yourturn/pull/61) |

| US-205 | Phase 3: design QA against the PDF | product-designer | US-202, US-103, US-104 | Pixel comparison against the source; deviations fixed or recorded | Human: Vid — DONE, merged #65 | [#65](https://github.com/shaahid-ahmed/yourturn/pull/65) `product-designer/us-205-design-qa` |
| US-003 | ∥ Phase 1: subscription receipt verification | backend | US-001 | $15/month plan, sandbox receipt validation, plan status, restore purchase; plan check gates the planner | Human: Vid — DONE, merged #66 | [#66](https://github.com/shaahid-ahmed/yourturn/pull/66) `backend/us-003-subscription` |
| US-011 | ∥ Phase 2: calendar integration | backend | US-001, US-002 | Google Calendar connect; free/busy only; per-calendar consent; no cross-member calendar content | Human: Vid — DONE, merged #67 | [#67](https://github.com/shaahid-ahmed/yourturn/pull/67) `backend/us-011-calendar` |
| US-012 | Phase 2: booking confirmation and reminders | backend | US-008, US-013 | Simulated booking labelled in the UI; confirmation before booking; reminder jobs; BOOKING_FAILED offers next-best | Human: Vid — DONE, merged #68 | [#68](https://github.com/shaahid-ahmed/yourturn/pull/68) `backend/us-012-booking` |

| US-018 | Phase 4: README and handoff | tech-writer | US-017 | Fresh-clone instructions exercised; exact limitations; no scaffold-as-product claims | Human: Shaahid — DONE | README + STATUS rewritten; fresh-clone exercised (clone → npm ci → make check 344/344) |

| US-014 | Phase 2: public HTTPS origin | sre-devops | US-006 | One public HTTPS origin for return/cancel and webhooks; configurable per environment | Human: Shaahid — DONE, merged #69 | [#69](https://github.com/shaahid-ahmed/yourturn/pull/69) `backend/us-014-public-origin` |

| US-016 | Phase 3: independent backend review | reviewer | US-005, US-006, US-015 | Non-author review; money branches covered; findings with owners | Human: Shaahid — DONE | review doc BACKEND_REVIEW_US016.md; gate 100/100, money lines 100, 4 findings fixed in review |
| US-017 | Phase 3: deployment and recovery | sre-devops | US-016 | One-command run, health, reset, restart recovery, backup recording | Human: Shaahid — DONE | server.mjs + dev:api + health/reset/recovery/backup, 4 tests green |

## BLOCKED

| ID     | Title                              | Role                       | Depends on                                                                | Acceptance criteria                                                                                                                                                | Claimed by                                                                              | Branch/PR                                                                                        |
| ------ | ---------------------------------- | -------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| US-015 | Phase 2: security and legal review | security, legal-compliance | US-001, US-006                                                            | Threat model, webhook handling, authorization matrix, P2P transfer questions; unresolved risks block the gate                                                      | Human: Rohan — security, legal-compliance, claude-opus-us015 (partial; waits on US-006) | [#62](https://github.com/shaahid-ahmed/yourturn/pull/62) `security/us-015-security-legal-review` |
| YT-007 | Phase 0: human release gate        | orchestrator               | YT-001, YT-002, YT-003, YT-004, YT-005, YT-006; real GitHub owners/remote | Independent review, green hosted CI, initial rules/stack ratification, protected main/merge approval and explicit human Phase 1 authorization; resolve Q-001–Q-005 | Human: Shaahid — Unclaimed                                                              | —                                                                                                |

## LATER

Ordered cut list: remove live venue search first, then turn-order optimization, Payouts refunds, memory recap. Never silently cut real sandbox payment, the drift graph demonstration or behavioral safeguards.

| ID     | Title                                                     | Role         | Depends on                                      | Acceptance criteria                                                                                                                                                           | Claimed by                        | Branch/PR |
| ------ | --------------------------------------------------------- | ------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | --------- |
| YT-039 | Live venue search — first cut                             | llm-engineer | YT-038; new PRD scope/ADR approval              | Verified provider, bounded search and no invented availability; outside current scope                                                                                         | Human: Alan — Unclaimed           | —         |
| YT-040 | RETIRED (ADR 0006) — Turn-order optimization — second cut | backend      | YT-038; new PRD/behavioral approval             | Retired: turn-order optimization: no turns in Unspoken. Original criteria: Fairness eval, no coercion/ranking and updated rotation contract; outside current scope            | ARCHIVED (ADR 0007) — was Shaahid | —         |
| YT-041 | RETIRED (ADR 0006) — Payouts refunds — third cut          | payments     | YT-038; new legal and human money-flow approval | Retired: Payouts refunds: Payouts is now a fallback only. Original criteria: Approved recipient/refund policy, provider evidence and 100% branch coverage; not authorized now | ARCHIVED (ADR 0007) — was Shaahid | —         |
| YT-042 | RETIRED (ADR 0006) — Memory recap — fourth cut            | frontend     | YT-038; new PRD/privacy approval                | Retired: memory recap: not part of Unspoken. Original criteria: Opt-in minimized recap with deletion and accessibility; outside current scope                                 | Human: Alan — Unclaimed           | —         |

### Handoff YT-006: payments → architect (YT-014) / Reviewer / human

Done: Sandbox go/no-go executed. Auth, catalog product, $5.00/month plan (`P-8AW24653TA0269907NL2PYKA`), subscription (`I-RPU70L1FAUWH`, APPROVAL_PENDING) and **a successful venue payout** (`CLAPZR33X2P32`, SUCCESS on readback, 12.00 USD, fee 0.25 USD). ADR 0005 records that Payouts — not Orders/Checkout — is the only mechanism that can spend collected funds; PAYMENTS.md, API.md, DATA_MODEL.md and openapi.json updated; one contract test added.
Not done: Subscription is not ACTIVE (payer approval is a browser step), no contribution received, no webhook listener, no signature verified end to end, no implementation. Payment gate remains closed.
How to verify: `make check`; re-run the spike and read back until the batch status is terminal; ADR 0005 lists every id.
Risks / gotchas: PENDING is not success — the create response was PENDING and settled ~25s later. Payouts charges a fee, so the ledger needs the extra entry or the derived pot drifts. Payout reversal is not an Order refund; that is a Legal question under Q-006.
Next step: Architect folds ADR 0005 into the YT-014 freeze; human decides the money flow before YT-017 implements anything.

## ARCHIVED: previous two-person split (ADR 0006 era)

Superseded by the four-person plan below. Kept as history; do not work from it.

<details>
<summary>Archived two-person split</summary>

Every task row names its human owner in **Claimed by** (`Human: <name> — <role>, <agent-id>`). Lanes are built to minimise cross-blocking: each lane owns disjoint files, its own branch prefix, and its own test command, so neither person waits on the other except at the five touchpoints below.

### Lane S — Shaahid: contract, server, money, infra, release

Owns `services/api/**` (including `src/payments/**`), `docs/03-architecture/**`, `docs/decisions/**`, `docs/05-risk/THREAT_MODEL.md`, `docs/05-risk/COMPLIANCE.md`, `docs/06-ops/**`, `packages/shared/**`, `tests/**` except fixtures, `.github/**`, `infra/**`, root tooling, `README.md`, `tasks/**`.

| Phase              | Tasks                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 0 (done / blocked) | YT-001, YT-002, YT-003, YT-004 done; YT-006 and YT-007 blocked on sandbox credentials and release gate                      |
| 1                  | YT-009 draft contract (in review), **YT-014 freeze**                                                                        |
| 2                  | YT-015 circles/rotation, YT-016 ledger + verified webhooks, YT-017 PayPal sandbox, YT-023 security, YT-025 legal/compliance |
| 3                  | YT-028 e2e + negative paths, YT-032 sandbox deploy                                                                          |
| 4                  | YT-035 README, YT-038 final human approval                                                                                  |
| Later              | YT-040, YT-041                                                                                                              |

### Lane A — Alan: product, behavioral, design, AI, frontend, narrative

Owns `apps/web/**`, `services/ai/**`, `docs/01-product/**`, `docs/02-design/**`, `docs/04-behavioral/**`, `docs/05-risk/PRIVACY.md`, `docs/05-risk/TRUST_SAFETY.md`, `docs/07-gtm/**`, `tests/fixtures/**`, `infra/seed/**`.

| Phase    | Tasks                                                                                                                                                                                   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 (done) | YT-005 behavioral baseline                                                                                                                                                              |
| 1        | YT-008 PRD/stories, YT-010 behavioral review, YT-011 flows/design system, YT-012 UX research plan, YT-013 voice and copy (all in review)                                                |
| 2        | YT-018 fixtures/venues/metrics, YT-019 tie-strength + drift, YT-020 three-plan copilot, YT-021 frontend on contract mocks, YT-024 privacy + Q-002, YT-026 trust & safety, YT-027 market |
| 3        | YT-029 accessibility audit, YT-030 behavioral release review                                                                                                                            |
| 4        | YT-033 graph animation, YT-034 pitch and demo script                                                                                                                                    |
| Later    | YT-039, YT-042                                                                                                                                                                          |

### The only five touchpoints

| #   | Touchpoint                               | Direction                                           | How to keep it cheap                                                                                                                                                                                                                             |
| --- | ---------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T1  | **YT-014 contract freeze**               | Alan's Phase 1 drafts → Shaahid freezes             | Alan may **read** `openapi.json` v0.1.0-draft now to plan, but Phase 2 implementation starts only after the freeze and an explicit human release (XR-28 — the earlier "builds immediately" wording contradicted API.md and the release boundary) |
| T2  | **Fixture schema** (YT-018)              | Alan produces → Shaahid consumes in YT-016/YT-028   | Fixture shape is agreed once at freeze and versioned (`fixtureRevision`); Shaahid never edits fixtures, Alan never edits API tests                                                                                                               |
| T3  | **YT-022 integration**                   | Joint, Alan leads the UI side, Shaahid the API side | Frontend already works against mocks, so integration is a swap of base URL plus error-state verification                                                                                                                                         |
| T4  | **YT-031 / YT-037 cross-review**         | Each reviews the other's lane                       | Required by rule 19: an author cannot approve their own work. Review comments only, no edits in the other lane                                                                                                                                   |
| T5  | **YT-036 rehearsal and YT-038 approval** | Joint, then Shaahid records the human decision      | One scheduled run-through; no code changes during rehearsal                                                                                                                                                                                      |

### Rules that keep the lanes independent

1. **Branch prefixes.** Shaahid uses `architect/*`, `backend/*`, `payments/*`, `security/*`, `legal/*`, `qa/*`, `sre-devops/*`, `orchestrator/*`. Alan uses `product-manager/*`, `behavioral-scientist/*`, `product-designer/*`, `content-designer/*`, `ux-researcher/*`, `data-analytics/*`, `ml-engineer/*`, `llm-engineer/*`, `frontend/*`, `privacy/*`, `trust-safety/*`, `growth-market/*`, `accessibility/*`, `demo-pitch/*`.
2. **No cross-lane edits.** Need a change in the other lane? Open a task row and tag the owner; do not edit it yourself, even to fix a build.
3. **Shared files are serialized, not co-edited.** `tasks/BOARD.md` (Shaahid coordinates), `AGENTS.md` and `README.md` (Shaahid), `docs/03-architecture/AI.md` (Shaahid owns the document, Alan owns the prompts section via a task).
4. **Each lane stays green on its own.** `make check` must pass in each lane's branch before review; neither lane may leave `main` red for the other.
5. **Blocked, not idle.** If a touchpoint is late, the waiting lane picks up its own unblocked rows (for example Alan: YT-027 market; Shaahid: YT-023 security) rather than reaching into the other lane.
6. **Money and privacy stay with their owners.** Only Shaahid touches payment code and legal/security docs; only Alan touches privacy, behavioral and trust-safety docs. Cross-lane _decisions_ (Q-001, Q-002, Q-006) need both plus the human.

## Lane A cross-review RV-001: disposition

Alan reviewed the Lane S Phase 1 contract drafts and requested changes: 29 findings, 7 freeze blockers (`docs/04-behavioral/PHASE1_CONTRACT_CROSS_REVIEW.md`, merged in PR #1). Architect response: `docs/03-architecture/CROSS_REVIEW_RESPONSE.md`.

**21 accepted and fixed** on `architect/xr-fixes`, each with a contract test: XR-01 (graph gate), XR-02 (server-chosen rationale key), XR-03 (verified-only budget), XR-04 (ledger provenance constraint), XR-05 (signed pot), XR-06 (Q-006 gates payments), XR-07 (one pause representation, seat preserved), XR-10 (one staleness code, all triggers), XR-11 (manual plan operation), XR-12 (server-derived budget), XR-13 (closed vocabularies), XR-14 (unverified state), XR-18 (not-ready on every funded action), XR-21 (idempotency binds target and body), XR-22 (peer view), XR-23 (no skipped state), XR-24 (stale proposal version), XR-26 (outcome bound to branch), XR-27 (counts and claims corrected), XR-28 (T1 wording, no notifications), XR-29 (re-sequencing below).

**8 deferred to a named owner** rather than guessed: XR-08 and XR-09 (peer-visible pause, agreement counts — Privacy/Behavioral/PM), XR-15 (post-exit own-data access — Q-006), XR-16 (prospective consent — Privacy), XR-17 (invalidation scope — applied in the data model, needs Privacy confirmation), XR-19 (operator and decline routes — next contract revision), XR-20 (identity model — precondition for YT-032), XR-25 (forfeit disclosure placement — Content).

**XR-29 re-sequencing applied:** YT-024 (Privacy/Q-002) and YT-025 (Legal) no longer depend on YT-014; the freeze now depends on them. The deadlock was real — the freeze needed answers from tasks that could not start until after the freeze.

## Lane S cross-review RV-002: Lane A drafts

Architect reviewed the Lane A Phase 1 drafts: **12 findings, 4 blockers** (`docs/03-architecture/LANE_A_REVIEW.md`). Verdict **request changes**. All four blockers are documents that now contradict the contract: the Orders money model survives in five places after ADR 0005 (LA-01), S-02 shows a peer-visible pause the contract no longer exposes (LA-02), the "Sam and Priya" copy held up as allowed is forbidden while the graph gate is closed (LA-03), and two behavioral items rely on the removed `skipped` turn state (LA-04).

**Stated limitation:** the reviewer authored most of the documents under review, so RV-002 is a consistency audit by the contract owner, **not** the independent review rule 19 requires. Independent review of the Phase 1 drafts — both lanes — is still owed.

**Closed by the Architect in this change (LA-07):** D-P03 was absent from the board, so nothing would ever have forced the decision. Now tracked as Q-007.

## RV-011 — awaiting a human decision (raised by Alan, PR #5)

PR #2 changed the money **mechanism** (Orders → Payouts) and merged to `main`. Rule 24 gates both money-flow changes and `main` merges on explicit human approval, and the board's old "Q-001 ANSWERED" wording implied an approval that was never recorded, while the PR text said the opposite. Alan is right that one recorded decision removes the ambiguity. The Q-001/Q-004 wording is now corrected (RV-010, done). **Still owed by the human — pick one:**

- **(a)** "The Payouts design direction was approved as the money mechanism; the execution gate remained closed." — or —
- **(b)** "PR #2 merged as documentation only; the money-flow decision was never made."

**DECIDED by the human (Shaahid), November 12, 2026 — option (a):** "The Payouts design direction was approved as the money mechanism; the execution gate remained closed." RV-011 is closed. The approval covers the **design direction only**: no execution, no capture, no payout, and the gate stays closed. Under ADR 0006 Payouts is now the **fallback** mechanism, so this approval is what makes that fallback legitimate to fall back _to_ — using it still requires its own decision, because it puts the platform back in custody.

The equivalent decision for Unspoken's live path (per-member authorize → capture, venue as payee) is **not** covered by this and has not been made.

</details>

## CURRENT PLAN: four collaborators, split by the UX spec

Source of truth for every screen: `docs/02-design/source/Unspoken Experience and Pages Spec.pdf` (18 pages). ADR 0007 records what the spec removes. This plan assigns the remaining work to four people. **Updated November 12, 2026:** every task Shaahid held was reassigned to Alan, Rohan and Vid (see the reassignment table under Lane S); Shaahid holds no tasks. Older YT/UN/RV rows that Shaahid held are marked archived because ADR 0007 superseded them. Task IDs `US-`; `∥` means it can run in parallel once its dependencies clear.

### Lane S — reassigned: backend, money, infra, release

Shaahid holds no tasks in this lane. Each task below now belongs to the person named, and path ownership for a task moves with it. US-016 (independent backend review) is Vid's because he authors no core backend; Rohan reviews Vid's US-003, US-011 and US-012 instead.

| ID     | Task                                            | Now owned by |
| ------ | ----------------------------------------------- | ------------ |
| US-001 | API contract for the UX-spec flow               | Rohan        |
| US-002 | Data model and state machine                    | Rohan        |
| US-003 | Subscription receipt verification               | Vid          |
| US-004 | Pods, invites, contacts matching                | Rohan        |
| US-005 | IOU ledger and balances                         | Alan         |
| US-006 | Member-to-member PayPal settlement              | Alan         |
| US-007 | Pod chat and real-time delivery                 | Rohan        |
| US-008 | Polls and ready check                           | Rohan        |
| US-009 | Planner: private budget checks and stretch asks | Alan         |
| US-010 | NYC events catalog and detail                   | Alan         |
| US-011 | Calendar integration                            | Vid          |
| US-012 | Booking confirmation and reminders              | Vid          |
| US-013 | Notifications and push                          | Rohan        |
| US-014 | Public HTTPS origin                             | Vid          |
| US-015 | Security and legal review                       | Rohan        |
| US-016 | Independent backend review                      | Vid          |
| US-017 | Deployment and recovery                         | Vid          |
| US-018 | README and handoff                              | Vid          |
| US-019 | HTTP routes for the contract                    | Rohan        |

Owns `services/api/**`, `docs/03-architecture/**`, `docs/decisions/**`, `docs/05-risk/THREAT_MODEL.md`, `docs/05-risk/COMPLIANCE.md`, `docs/06-ops/**`, `infra/**`, `tests/**` except fixtures, `.github/**`, `packages/shared/**`, `tasks/**`, `README.md`.

**Phase 1 — contracts (start immediately, `∥`)**

| ID     | Task                                         | Acceptance criteria                                                                                                                                                                                                                           |
| ------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-001 | ADR 0007 + API contract for the UX-spec flow | `openapi.json` rewritten for pods, chat, polls, hangout lifecycle, balances, payments, calendar, subscriptions; old COMMITTING/SETTLING/VOIDING states gone; no hold/capture/void operations remain; contract tests replace the retired suite |
| US-002 | Data model and state machine                 | Pods, membership, invites, messages, votes, hangout states per the spec list, balances, payments, calendar links, subscription receipts; append-only ledger; no stored balance; migration-tested on a scratch SQLite file                     |
| US-003 | Subscription: app-store receipt verification | $15/month plan, receipt validation, plan status, restore purchase; a plan check gates the planner; **sandbox receipt only**, no live store                                                                                                    |
| US-004 | Pods, invites, contacts matching             | 3–8 enforced; single-use invite links; contact matching by phone; declined contacts leaves invite links as the only path                                                                                                                      |

**Phase 2 — build (`∥` where marked)**

| ID     | Task                                              | Acceptance criteria                                                                                                                                                                                                                                                                                                          |
| ------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-005 | ∥ IOU ledger and balances                         | Balances derived from the ledger only; split sums exactly with the remainder rotating; `owed/pending/paid/failed` states; 100% branch coverage on money logic                                                                                                                                                                |
| US-006 | ∥ Member-to-member PayPal settlement              | Sandbox payment between two personal accounts; verified webhook before any balance effect; idempotency bound to target and body; a failed payment returns the balance to `owed`; **gate closed** until Q-010 is answered                                                                                                     |
| US-007 | ∥ Pod chat and real-time delivery                 | Message storage, pagination, push delivery, structured planner cards; the planner is a participant; no chat content in any other pod's response                                                                                                                                                                              |
| US-008 | ∥ Polls and ready check                           | Activity shortlist, time poll, ready check; votes visible **with names**; a tie breaks on lower cost then earlier start; poll closing and reminder jobs                                                                                                                                                                      |
| US-009 | ∥ Planner: private budget checks and stretch asks | Per-member check returns only feasible/not-feasible; a stretch ask goes to that member's private chat only; the group never sees the ask or the answer                                                                                                                                                                       |
| US-010 | ∥ NYC events catalog and detail                   | Seeded catalog, search and filters (date, price, category, neighborhood), event detail, suggest-to-pod; every fixture visibly synthetic                                                                                                                                                                                      |
| US-011 | ∥ Calendar integration                            | Google Calendar connect, free/busy-only reads, consent per calendar; event write after booking; **no calendar content visible to other members**                                                                                                                                                                             |
| US-012 | Booking confirmation and reminders                | Simulated booking for seeded venues, labelled in the UI; confirmation required before anything is booked; reminder jobs; `BOOKING_FAILED` path offers the next-best plan                                                                                                                                                     |
| US-013 | Notifications and push                            | Per-type switches (polls, reminders, private asks, money); private reminders never in pod chat; no notification is sent without Content + Behavioral approval                                                                                                                                                                |
| US-014 | Public HTTPS origin                               | A phone cannot reach 127.0.0.1; one public HTTPS origin for return/cancel URLs and the webhook listener; URLs configurable per environment                                                                                                                                                                                   |
| US-015 | Security and legal review                         | Threat model, webhook signature handling, authorization matrix, pooled-money and P2P transfer questions; unresolved risks block the gate                                                                                                                                                                                     |
| US-019 | HTTP routes for the contract                      | Every openapi.json operation is served under /api/v1; requests and responses are validated against the contract; errors match the contract Error / PaymentGateError shapes; createSettlementPayment stays gated closed (409 payment_gate_blocked). Fastify per ADR 0002, which is not ratified yet (YT-007, held by Shaahid) |

**Phase 3–4**

| ID     | Task                       | Acceptance criteria                                                                         |
| ------ | -------------------------- | ------------------------------------------------------------------------------------------- |
| US-016 | Independent backend review | Non-author reviewer; money branches covered; findings recorded with owners                  |
| US-017 | Deployment and recovery    | One-command run, health, reset, restart recovery, backup demo recording                     |
| US-018 | README and handoff         | Fresh-clone instructions exercised; exact limitations stated; no scaffold-as-product claims |

### Lane A — Alan: mobile app, pods, planning, money screens

Owns `apps/web/**` (or the mobile shell), `services/ai/**`, `docs/01-product/**`, `docs/04-behavioral/**`, `docs/07-gtm/**`, `tests/fixtures/**`, `infra/seed/**`.

| ID     | Task                                      | Depends on                     | Acceptance criteria                                                                                                                                                                            |
| ------ | ----------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-101 | ∥ Entry and onboarding P1–P4              | US-001                         | Splash, phone sign-in, $15 subscription, six-step profile (basics, interests, private limits, calendar, PayPal, permissions); every field editable later; private limits behind the lock badge |
| US-102 | ∥ Home and pods P5–P6                     | US-001, US-004                 | Floating pod bubbles with a stage cue that never shows a single member's status; create a pod from contacts or an invite link; empty state                                                     |
| US-103 | ∥ Pod chat and planning P7–P12            | US-001, US-007, US-008, US-012 | Chat with the planner inside it; shortlist, time poll, ready check, booking confirmation as cards; votes visible with names; no card says "budget-friendly" or "why this one"                  |
| US-104 | Money screens P13–P15, P23                | US-001, US-005, US-006         | Payer and split, settle up, money page with two totals and per-hangout lines; a rating that goes only to the member's own planner                                                              |
| US-105 | ∥ Hub P16–P22                             | US-001, US-010, US-011         | Events search and detail, calendar, profile, settings, payment methods, private planner chat with budget-stretch cards                                                                         |
| US-106 | AI: constraint extraction and coordinator | US-001, US-009                 | Closed-vocabulary output, schema validation, bounded retry then deterministic fallback; red-team prompts leak zero constraints; evals recorded                                                 |
| US-107 | Behavioral and trust review               | US-101–US-105                  | Sign-off against the eight ethical rules; notification copy approved; no shame, no public scores, no coercion                                                                                  |

### Lane V — Vid: visual design, UI kit, motion, accessibility

Owns `docs/02-design/**` (the designer's source folder excepted), the design tokens, and the visual layer of the app shell.

| ID     | Task                        | Depends on            | Acceptance criteria                                                                                                                                                |
| ------ | --------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| US-201 | Design system and tokens    | US-001                | Phone-first tokens at 360–430 CSS px, type scale, spacing, colour; PayPal blue as line art only, never fills or buttons                                            |
| US-202 | ∥ All 23 screens to spec    | US-201                | Every screen from the page map, including loading, empty, error and refused states; votes visible with names; no hover-only affordance; 44px minimum touch targets |
| US-203 | ∥ Motion and reduced-motion | US-202                | Logo turn, bubble drift, card arrival, booking pop, balance thread; every animation has a reduced-motion equivalent                                                |
| US-204 | Accessibility audit         | US-202                | WCAG 2.2 AA evidence: contrast, focus order, screen reader, reduced motion; colour is never the only signal                                                        |
| US-205 | Design QA against the PDF   | US-202, US-101–US-105 | Pixel comparison against the source spec; every deviation either fixed or recorded as a decision                                                                   |

### Lane R — Rohan: QA, fixtures, demo

Owns `tests/e2e/**`, `tests/fixtures/**` (except the designer's source folder), `docs/07-gtm/DEMO_SCRIPT.md`, and the recorded demo.

| ID     | Task                         | Depends on                    | Acceptance criteria                                                                                                                        |
| ------ | ---------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| US-301 | ∥ Test plan and fixtures     | US-001                        | Seeded pods, members, venues, events; every fixture visibly synthetic; no real personal data                                               |
| US-302 | ∥ E2E of the happy path      | US-101–US-105, US-005, US-006 | Onboarding → pod → shortlist → time poll → ready check → booking → split → settle; each step asserted                                      |
| US-303 | Failure and negative paths   | US-302                        | No plan fits, nobody votes, nobody says yes, booking fails, a payment fails, a member says yes then leaves, a PayPal webhook arrives twice |
| US-304 | Demo script and rehearsal    | US-302, US-202                | Under three minutes; honest labels for simulated booking and any unproven payment; recorded backup                                         |
| US-305 | Final QA and regression pass | US-303, US-016, US-204        | Full suite green on CI; no unresolved release blocker; the demo runs from a fresh clone                                                    |

### Cross-lane touchpoints

| Touchpoint              | Who                | Why                                                          |
| ----------------------- | ------------------ | ------------------------------------------------------------ |
| Contract freeze         | Rohan + Alan       | The API is what the app builds against                       |
| Design handoff          | Vid → Alan         | Screens are built from Vid's tokens and states               |
| Private limits boundary | Alan + Vid         | The lock badge and the private chat must match the behaviour |
| Demo integration        | Rohan + Alan + Vid | The recorded demo needs all lanes green                      |

## Open questions (current)

- **Q-010 @payments @legal-compliance:** which PayPal product can pay a **personal** sandbox account, and does it work? The spec's own decision 4 offers an alternative: the payer pays the venue however the venue takes payment, and the app only tracks IOUs. If that alternative is chosen, no venue payment exists and Q-010 closes.
- **Q-011 @human @product-manager:** decisions 1, 2, 4, 5, 6, 14 and 16 from the spec. These block backend code, not design. **Update (US-001, Nov 12):** the draft contract marks each as `x-open-decision` with a stated default — #6 only the payer confirms, #14 the split card is shared among that hangout's yes-members while running balances stay private to their parties, #5 a volunteer payer. Backend work proceeds against those defaults; the decisions remain open (see the ADR 0007 update).
- **Q-012 @legal-compliance @payments:** the spec removes the platform-holds-funds design. A member-to-member transfer is a different legal question from a pooled pot, and it needs its own review.
- **Q-014 @human @product-manager (open):** three spec decisions have no default in the contract or code (listed in API.md): what happens when a pod drops below 3 members (decision 11, part); the payer dropping out after booking (decision 19; spec recommends the pod picks a new payer); and the single-yes double-check (decision 17; spec recommends the planner checks before going ahead). Today one yes moves the ready check on like any other count.
- **Q-013 @privacy @behavioral-scientist:** the spec makes votes and yeses visible with names, which reverses the count-only rule. That is now a deliberate product choice and must be written down as such, not left as a contradiction.

## ARCHIVED open questions (ADR 0006 era)

- **Q-001 MECHANISM VERIFIED; END-TO-END FUNDING NOT DEMONSTRATED @payments @legal-compliance @architect** (corrected per RV-010, Alan was right that "ANSWERED" overstated it — the subscription is still `APPROVAL_PENDING` and the webhook leg is blocked, so only the **outbound** payout leg is proven; superseded for the product by ADR 0006, which removes the pot entirely): Orders/Checkout cannot spend collected funds. The venue is paid with **Payouts** from the collector balance — verified in sandbox on 2026-11-11 (batch `CLAPZR33X2P32`, SUCCESS, 12.00 USD, fee 0.25 USD, txn `0VL83865553929934`). See ADR 0005. The _mechanism_ is proven; the money flow is still unapproved and the gate stays closed. Legal review of pooled funds and payout reversal remains open under Q-006.
- **Q-002 MOOT — THE GRAPH IS GONE @privacy @behavioral-scientist @product-designer:** ADR 0006 removes tie scoring, drift prediction and the friendship graph from the product. Unspoken infers nothing about relationships; each agent reasons only over constraints its own member stated about themselves. Nothing to decide. Original text for the record: Resolve real-user red/green graph versus private drift/no visible scores, own-data access versus third-party inferences, and host membership in the affected pair. Until approved, graphs are labelled synthetic only and no real-user scores appear. Phase 1 may proceed only with an explicit synthetic-only boundary if the full policy remains unresolved.
- **Q-003 @orchestrator @sre-devops:** Remote `shaahid-ahmed/yourturn`, owner `@shaahid-ahmed`, main promotion and hosted CI are verified. CODEOWNERS activation and branch protection remain separate work; commented mappings do not enforce reviews.
- **Q-004 NO FALLBACK NEEDED ON CURRENT EVIDENCE, CONTINGENT ON THE INBOUND LEG @payments @architect @orchestrator** (corrected per RV-010): the outbound venue payout succeeded in sandbox, so no simulated fallback is needed on what is proven today, and ADR 0003 stays unused — but the inbound contribution leg was never completed, so this is contingent rather than moot. The never-cut real-payment requirement is satisfiable as designed. Reopen only if a later run fails for a real reason.
- **Q-005 @payments @architect @security:** Rule 8 says every PayPal call carries an idempotency key. Document internal operation keys and endpoint-specific provider support/retention; do not infer that every API enforces a supplied header. Any RULES change needs human approval; current rule is unchanged.
- **Q-006 REWRITTEN BY ADR 0006 @legal-compliance @payments @privacy:** the **custody** half is moot on the preferred path — nothing is pooled, each member authorizes their own share, and the venue is the payee, so the platform never holds funds. What survives: (a) **void versus refund rights** — cancelling a hold and refunding a capture differ in timing and in what the payer is owed; (b) what the payer is told when a capture fails after others succeeded (`SETTLEMENT_FAILED`); (c) the under-estimate refund path; (d) deletion and own-data access for a member's vault entry. (e) If the Payouts fallback is ever used, the platform holds funds again and the **whole original question returns** — that is a new human decision, not a code path. Owner stays Legal + Payments + Privacy.
- **Q-008 @payments @architect:** **Do captured funds actually land in the venue account?** The third-party `payee` order was accepted at create time and PayPal records the venue as payee (orders `8SX33777K0904662Y`, `5JK26843KL530842H`), but acceptance is not settlement — `PAYEE_ACCOUNT_RESTRICTED` and similar can surface at authorize or capture. Needs: payer approval in a browser (human step), then authorize → capture → readback of the **venue account's** own transaction. Until then the preferred money path is **not blocked** rather than proven, and ADR 0005 Payouts remains the labelled fallback. Blocks the Unspoken contract freeze.
- **Q-007 SURVIVES THE PIVOT, RESHAPED @product-manager @llm-engineer @frontend:** in Unspoken the equivalent is **`NO_PLAN` — no candidate is feasible for everyone**. The diversity rule (at least one free or near-free candidate) means budget can almost never be the cause, which is a real privacy win: the visible failure state cannot point at someone's money. Still to decide: how many regeneration attempts, whether widening the window or the area is offered automatically or only on request, and the exact wording that reveals no reason. Original YourTurn text for the record — **D-P03, what happens when the copilot returns nothing usable:** The PRD proposes one bounded regeneration, then an explicit unavailable result, with browsing the fixed venue list or deferring as the non-AI path, and the same budget, host and payment gates on any manually selected plan. The contract now has `createManualPlan` (XR-11) and `S-04` needs a declined-suggestions state (LA-12), but the **product** decision was tracked nowhere outside `PRD.md`, so nothing would have forced it (LA-07). Needed before YT-014.

## Handoffs

### Handoff US-015 (partial): security + legal-compliance (Rohan, claude-opus-us015) → Payments (US-006) / Legal counsel / human

Done:

- Replaced the Phase 0 stubs in `docs/05-risk/THREAT_MODEL.md` and `COMPLIANCE.md`.
- The threat model covers assets, trust boundaries, attackers, the authorization matrix with executed evidence, webhook verification requirements 1–7 for US-006, LLM boundary requirements, abuse cases T1–T12, and unresolved blockers S-1 to S-7.
- Compliance has a disclaimer draft for the Tech Writer, P2P and money-transmission questions L-1 to L-5, PayPal terms, the app-store question, cancellation and dispute policy gaps, a gambling assessment (none identified in the design) and the counsel gate.
- Added `tests/authz-matrix.test.mjs`, which runs 13 pod-scoped operations as an outsider, as another pod's member, against a missing pod, and with another pod's ids.
  Timestamp: November 12, 2026.
  Not done (blocked on US-006 / Q-010 / Q-012):
- Webhook signature handling cannot be reviewed as code, because none exists (S-1).
- The P2P transfer questions need a chosen PayPal product and qualified counsel.
- No legal source was consulted, so every L-item is unresolved.
  How to verify: `make check`; `node --test tests/authz-matrix.test.mjs`.
  Risks / gotchas: this review approves nothing. Each S- and L-item blocks the payment gate or a reachable deployment as listed. Stacked on US-013 (PR #61).
  Next step: Payments builds US-006 to requirements 1–7, then this task resumes to review that handler. Legal/counsel answers L-1 to L-5. Tech Writer places the disclaimer.

### Handoff US-013: backend (Rohan, claude-opus-us013) → Content Designer + Behavioral Scientist (Alan) / Reviewer

Done: Added `services/api/src/notifications.mjs`:

- The four per-type switches (polls, reminders, privateAsks, money), set only as a complete boolean set and defaulting on.
- Device token registration; a token moves to its new owner.
- `NotificationGate`: keyed by notification kind; it cannot approve a kind without both a Content Designer and a Behavioral Scientist approval reference. With none recorded, every delivery is held.
- `dispatch` and `notificationPort`: they apply the pod mute, membership, the switch, the phone's permission and devices, then the gate.
- Payloads are pointers (kind plus ids), never text, names, a pod name or amounts.
- Private reminders and asks reach one member, carry no pod id, and the dispatcher has no path into pod chat.
  Timestamp: November 12, 2026.
  Not done: no APNs/FCM provider is wired (the default sender sends nothing), and no copy exists to approve.
  How to verify: `make check`; `node --test tests/notifications.test.mjs`.
  Risks / gotchas: three choices need Content + Behavioral decisions. (1) The spec names no switch for chat text messages or pod invites; only the pod mute and the gate apply to text messages, and invites are not wired. (2) Balance reminders map to `money`, not `reminders`. (3) Every switch defaults to on. Stacked on US-008 (PR #60).
  Next step: Content Designer and Behavioral Scientist approve copy per kind and record the references; independent Reviewer. Rohan starts US-015.

### Handoff US-008: backend (Rohan, claude-opus-us008) → Reviewer / Alan (US-103)

Done: Added `services/api/src/polls.mjs` and migration 2 (`ready_check`, append-only `reminder_sent`):

- `openActivityPoll` moves the hangout PLANNING → ACTIVITY_VOTE and posts a card. `openTimePoll` opens the time poll.
- `castOwnVote`: single choice, changeable until close.
- `getPoll`: votes visible with first names (Q-013).
- `pickWinner`: most votes, then lower per-person cost, then earlier start, then listing order.
- `runPollJobs`: extends a vote-less poll once, then closes it. A winner → TIME_VOTE or READY_CHECK; no votes → NO_PLAN with a planner offer card. Closes due ready checks: one or more yeses → AWAITING_CONFIRMATION; zero → NO_PLAN with a next_best offer.
- `setOwnReadyAnswer`: named answers; yes needs a linked PayPal account.
- `sendDueReminders`: private reminders, at most once each, only to members who have not voted or answered, in their planner chat plus a push intent. Never in pod chat.
- I split transaction-free variants out of `hangout-store` and `chat`, so each step commits together.
  Timestamp: November 12, 2026.
  Not done: no scheduler or HTTP route. Spec decision 17 (the planner checks before going ahead when only one member says yes) is not modelled.
  How to verify: `make check`; `node --test tests/polls.test.mjs`.
  Risks / gotchas: before the ready check, any joined member may vote, because yes-members do not exist yet. Stacked on US-007 (PR #59).
  Next step: Independent Reviewer. Rohan starts US-013.

### Handoff US-007: backend (Rohan, claude-opus-us007) → Reviewer / Alan (US-103)

Done: Added `services/api/src/chat.mjs` over the US-002 schema, plus `db/transaction.mjs`:

- Member text messages, deduplicated by `clientMessageId`.
- Planner cards, posted with author `planner`. A card may only point at the same pod's hangout and poll.
- Newest-first cursor pagination that stays stable when messages share a timestamp.
- `PodEventBus`: in-process real-time delivery that re-checks membership on every event, so a member who leaves stops receiving at once.
- Push intents for joined, unmuted members other than the sender, handed to an injected port.
- The private planner chat, which has no pod parameter. A stretch-ask message goes only to the member it is about.
- Events and push intents carry pointers only, never message text. No content crosses pods.
  Timestamp: November 12, 2026.
  Not done: no HTTP or SSE route (Fastify is undecided). Push sending and its gate are US-013. Chat extras (photos, reactions) are not in the draft contract.
  How to verify: `make check`; `node --test tests/chat.test.mjs`.
  Risks / gotchas: the event bus is single-process; a multi-instance deployment needs a shared broker (US-017). Stacked on US-004 (PR #58).
  Next step: Independent Reviewer. Rohan starts US-008.

### Handoff US-004: backend (Rohan, claude-opus-us004) → Reviewer / Alan (US-102)

Done: Added `services/api/src/pods.mjs` over the US-002 schema, using the contract's error codes:

- Contact matching by phone writes nothing, so unmatched numbers are never stored.
- `createPod`, `inviteMembers` (creator only), accept and decline of invitations.
- Single-use invite links. Only a SHA-256 digest of the token is stored. Unknown and revoked links look like a missing pod.
- Leave, remove (creator only), `getPod` (first names only) and `readyForPlanning`.
- 3–8 is enforced: joined members, pending invitations and active links together never exceed 8, and planning needs 3 joined.
- Declined contacts: matching returns nothing and inviting by user id is refused with `validation_failed` (`contacts_permission_not_granted`), so invite links are the only path.
  Timestamp: November 12, 2026.
  Not done: No HTTP route. Adding Fastify changes root dependencies and waits on a human decision. Invite delivery and notifications are US-013.
  How to verify: `make check`; `node --test tests/pods.test.mjs`.
  Risks / gotchas: Contacts permission is what the phone reports; the server cannot verify it. Stacked on US-002 (PR #57) and US-001 (PR #56), both unmerged.
  Next step: Independent Reviewer. A routes task wires these functions to the contract operations.

### Handoff US-002: backend (Rohan, claude-opus-us002) → Reviewer / Alan (US-005)

Done: Added `services/api/src/db/migrations.mjs` and `database.mjs`. Migration 1 creates every entity in the contract on `node:sqlite`, with no new dependency. SQLite itself enforces STRICT integer cents, append-only ledger and history tables, no balance column, only the ADR 0007 states, an 8-member ceiling, single-use invite links, signature-verified provider events and no pod column on private data. Added `services/api/src/hangout-lifecycle.mjs`, the transition table, following the contract as the source of truth: any number of yeses is enough, `NO_PLAN` and `BOOKING_FAILED` offer a way back, and only the payer confirms. Added `db/hangout-store.mjs`, which applies an event in one versioned transaction. Rewrote `DATA_MODEL.md` and `ARCHITECTURE.md`. Shaahid's ADR 0006 modules are unchanged. Timestamp: November 12, 2026.
Not done: Balance derivation and the split are US-005 (Alan); the ledger kinds here match his PR #51. No route uses the schema yet. Seeding the schema is US-301.
How to verify: `make check`; `node --test tests/db-schema.test.mjs tests/hangout-lifecycle.test.mjs`.
Risks / gotchas: PR #51 also rewrites `hangout.mjs` with a state machine that differs from the contract (all-must-confirm ready check, terminal `NO_PLAN`/`BOOKING_FAILED`, a host confirming). This module is the contract-aligned one. PR #51 should use it rather than ship a second table. Stacked on US-001 (PR #56), which is unmerged.
Next step: Independent Reviewer. Alan aligns PR #51 with `hangout-lifecycle.mjs`. Rohan starts US-004.

### Handoff US-001: architect (Rohan, claude-opus-us001) → Reviewer / Alan (contract freeze touchpoint)

Done: Rewrote `docs/03-architecture/openapi.json` as `0.2.0-draft` for the UX-spec flow under ADR 0007: 74 operations across 59 paths. It covers pods, invites and contact matching, pod chat and the event stream, the private planner chat and stretch asks, polls, the ready check, payer and booking confirmation, split, balances, settlement (gated), PayPal link, calendar, subscription, events and notification settings. Every hold/capture/void, pot, circle, turn and Payouts operation is removed, and `HangoutState` is exactly the ADR 0007 list. Q-011 #5, #6 and #14 are marked `x-open-decision` with the strictest defaults, approved by Rohan as Architect. Rewrote `API.md`, appended the US-001 update to ADR 0007, and replaced `tests/contract.test.mjs` with 17 tests for the new contract. Timestamp: November 12, 2026.
Not done: Metaschema validation was not run (no validator installed). `DATA_MODEL.md` and `ARCHITECTURE.md` still describe the retired model; that is US-002. `packages/shared` types are not generated. No route is implemented. AGENTS.md section 8 and STATUS.md still say Q-011 blocks backend code; they need an owner edit.
How to verify: `make check`; `node --test tests/contract.test.mjs`.
Risks / gotchas: #14 uses the middle default approved on review: split cards are shared among a hangout's yes-members (matches P13), running balances stay private (recorded in API.md). Accepted assumptions: PayPal must be linked before volunteering as payer; polls are single-choice and editable until close; account delete and PayPal unlink are refused while balances are open. Shaahid's retired modules in `services/api/src/` still use the old states and are left untouched by instruction.
Next step: Independent Reviewer reviews the PR. Alan reviews it as the contract-freeze counterpart. Then Rohan starts US-002 and US-004.

### Handoff YT-001: orchestrator → Reviewer / human

Done: Required scaffold documents and phase board assembled on local bootstrap branch; rules preserve the user's 24 rules and global DoD. Parent coordinates one-time setup ownership. Timestamp: November 11, 2026.
Not done: Full Phase 0 go/no-go, hosted CI, real GitHub owners, human approvals or Phase 1 implementation.
How to verify: `make check`; `git status --short`; inspect all required paths and STATUS.md.
Risks / gotchas: A local commit is neither main merge nor product readiness. Q-001–Q-006 remain open.
Next step: Independent scaffold review, requested local commit, then stop for human decision; do not release Phase 1.

### Handoff YT-002: architect → SRE / Reviewer / human

Done: ADR 0001 and ADR 0002 recorded before tooling. npm workspaces/TypeScript chosen; framework/API/model contracts remain stubs.
Not done: Human ratification or product architecture/contracts.
How to verify: Read both ADRs; `make typecheck` checks strict bootstrap tooling.
Risks / gotchas: npm replaces recommended pnpm; no money-flow ADR is approved.
Next step: Human ratifies provisional stack at YT-007; Architect starts contracts only after release.

### Handoff YT-003: sre-devops → Reviewer / human

Done: Root Make/npm commands, lockfile, strict typing, setup server, synthetic seed, real Secretlint invocation and CI workflow authored. Server/dev/seed tests were observed failing before implementations, then passing.
Not done: Hosted CI, deploy, real PayPal integration, product e2e or money coverage. See STATUS.md for final executed checks.
How to verify: `make install && make check && make seed`; `make dev` and GET `/health` on loopback port 3000.
Risks / gotchas: `.env.example` is a variable inventory, not loaded by bootstrap; PORT must be omitted or valid, not exported blank. Never publicly expose setup server.
Next step: Review exact staged diff; human supplies remote/owners for hosted checks.

### Handoff YT-004: tech-writer → Orchestrator / Reviewer

Done: All 24 role files with eight required sections and roster; narrow ownership, shared-file conflicts and safe handoff protocol documented. Child reported validation of filenames, headings, roster and behavioral rules; parent structural tests independently verify these.
Not done: Hosted CI, independent approval and human gate.
How to verify: `make test`; read AGENTS.md and roster against original requested roles.
Risks / gotchas: Future ownership is not permission for Phase 1 implementation.
Next step: Independent review; preserve IN REVIEW while external gates are missing.

### Handoff YT-005: behavioral-scientist → Orchestrator / Reviewer

Done: Complete principles, exact eight ethical rules plus testable checks, source-backed research register separating findings/hypotheses/policy. Hall publisher source uses an explicitly dated archive after live-page access failed.
Not done: Product acceptance tests, policy resolution or revision-bound product behavioral sign-off.
How to verify: `make test`; read checklist and research source/limitation sections.
Risks / gotchas: Synthetic graph does not validate real friendship prediction; forfeit and graph privacy remain owner/human decisions.
Next step: Review baseline, then apply checklist to future features only after Phase 1 release.

### Handoff YT-008 / YT-012: product-manager + ux-researcher → architect (YT-014) / Reviewer

Done: `docs/01-product/PRD.md` (problem, scope map, role journeys, demo conventions D-P01–D-P04, non-goals, measurement intent M-01–M-06, gate table) and `docs/01-product/USER_STORIES.md` (US-001–US-014 with Given/When/Then, plus the UX research section).
Not done: METRICS.md (Data, YT-018); no participant was contacted and no finding exists; payment, forfeit and graph-visibility decisions remain pending.
How to verify: `make check`; read PRD §Scope and acceptance map against US ids; confirm every persona is labelled invented.
Risks / gotchas: Stories are draft acceptance targets, not implemented behavior. D-P01 minimum amount and D-P02 rotation exceptions are proposals needing owner decisions.
Next step: Architect reconciles stories with the contract at YT-014; Alan owns follow-up in Lane A.

### Handoff YT-009: architect → Reviewer / YT-014 freeze

Done: ADR 0004 (written before the schema), `ARCHITECTURE.md`, `DATA_MODEL.md`, `API.md`, `openapi.json` (OpenAPI 3.1, `0.1.0-draft`, 21 operations), `packages/shared/README.md` generation plan, and `tests/contract.test.mjs` (9 structural contract tests).
Not done: Freeze, generated shared types, any implementation, any provider call. Full OpenAPI 3.1 metaschema validation is still future work; current tests are structural.
How to verify: `npm test`; `node --test tests/contract.test.mjs`; negative control mutated the spec 8 ways (float money, two plans as success, pause reason, real tie score, removed payment gate, approval-as-payment, false frozen flag, dangling ref) and every mutation failed the suite before the spec was restored.
Risks / gotchas: Contract is draft; money flow unverified (Q-001), provider idempotency semantics unverified (Q-005). The payment gate is contract-level only — no runtime exists to enforce it yet.
Next step: YT-014 reconciliation once Q-001/Q-002/Q-006 decisions land; Shaahid owns Lane S.

### Handoff YT-010: behavioral-scientist → Reviewer / YT-030

Done: `docs/04-behavioral/PHASE1_REVIEW.md` — rule-by-rule review of the Phase 1 drafts, what is approvable now, what cannot be approved, and testable checks B-01–B-14 handed to Architect, Designer, Frontend, QA and Demo.
Not done: Product sign-off (YT-030), notification approval, Q-002/Q-006 resolution, any model review.
How to verify: Read PHASE1_REVIEW against the eight rules in ETHICS_CHECKLIST; the eight rules and research baseline are unchanged.
Risks / gotchas: Review is bound to these document revisions and does not transfer to an implementation. A pause that fails to stop collection would be coercive, so the payment gate must stay closed until Q-006 is decided.
Next step: Owners implement B-01–B-14 as tests; Alan owns Lane A behavioral follow-up.

### Handoff YT-011 / YT-013: product-designer + content-designer → frontend (YT-021) / Accessibility (YT-029)

Done: `FLOWS.md` (screen/state inventory S-01–S-09, five flows with empty/loading/error/permission states, synthetic graph boundary, unresolved-design table) and `DESIGN_SYSTEM.md` (token tables with computed contrast ratios, component states, keyboard/reduced-motion rules, non-color graph cues) and `VOICE_AND_TONE.md` (voice rules, banned copy table, host-suggestion rules, notification dual approval, money/error disclosures).
Not done: No UI code, no token files, no notification copy approved, no accessibility audit.
How to verify: Contrast ratios in DESIGN_SYSTEM were computed from the listed hex values and can be re-derived; WCAG claims cite the W3C Recommendation only, with an explicit no-conformance-claim note.
Risks / gotchas: Citing WCAG is not an audit. Forfeit, pause-visibility, real-user graph and rotation wording remain blocked copy.
Next step: Frontend builds S-01–S-09 against contract mocks after freeze; Accessibility audits real screens at YT-029. Alan owns both.

### Handoff RV-001: reviewer → architect / orchestrator (Shaahid); product-manager, behavioral-scientist, privacy (Alan)

Done: Lane A half of the T4 cross-review. Reviewed the YT-009 drafts (API.md, openapi.json, DATA_MODEL.md, ARCHITECTURE.md, ADR 0004) against US-001–US-014 and PHASE1_REVIEW B-01–B-14. Findings XR-01–XR-29 are in `docs/04-behavioral/PHASE1_CONTRACT_CROSS_REVIEW.md`, filed to owners as RV-002–RV-009 in TODO. Verdict: **request changes**. Seven findings are freeze blockers: real-member inference while Q-002 is open, unconstrained guidance text, synthetic money in payment budget checks, unverified ledger provenance, pot sign, Q-006 missing from the payment gate, and undefined paused-member semantics. Timestamp: November 11, 2026.
Not done: No Lane S file edited. No policy decided; Q-001/Q-002/Q-005/Q-006 stay open. PAYMENTS.md and AI.md not reviewed. Lane S review of the Lane A drafts (the other half of T4) is Shaahid's. Nothing pushed; all changes are local on `reviewer/phase1-contract-review`.
How to verify: Read the review file against the cited sections. `node -e` count of `openapi.json` operations gives 23 (XR-27). `npm run check` passes in a clean LF checkout of this branch; see the risks line for the Windows CRLF caveat.
Risks / gotchas: RV rows use an `RV-` prefix so `tests/repository.test.mjs` (pinned at 42 YT rows, Lane S) still passes; renumbering is Orchestrator's call. On this Windows machine `make` is not installed and global `core.autocrlf=true` makes Prettier flag every checked-out file, so checks were run with `npm run check` in a temporary clone with `core.autocrlf=false` for that command only. This review does not satisfy the human-waived Reviewer gate for the Phase 1 merge, and approves nothing.
Next step: Architect addresses RV-002–RV-006 before YT-014. Orchestrator handles RV-007, including the XR-29 sequencing deadlock between YT-014 and YT-024/YT-025. Alan picks up RV-008 and RV-009 in Lane A.

### Handoff RV-001 (PR #4 review): reviewer → architect / orchestrator / human (Shaahid); product-manager, behavioral-scientist, privacy (Alan)

Done: Independent review of PR #4 (`architect/xr-fixes` → `main`, tip `5832210`), the architect's RV-001 response. Read `CROSS_REVIEW_RESPONSE.md`, `LANE_A_REVIEW.md`, `OSS_REVIEWER_RUN.md` and verified every mechanical fix against the committed `openapi.json` / `DATA_MODEL.md` / `contract.test.mjs` on the branch, not the response table. All seven freeze blockers (XR-01..07) and the checkable majors (XR-10,11,12,13,14,18,22,23,24,26,27) are actually present with tests or schema constraints. Eight deferrals are correctly assigned to owners. Verdict: **approve the contract fixes**, two corrections requested — RV-010 (Q-001/Q-004 board wording overstates evidence: outbound payout verified, inbound leg APPROVAL_PENDING, webhook blocked) and RV-011 (record the PR #2 money-flow/main-merge decision under RULES 24). Full comments: `docs/04-behavioral/PR4_REVIEW_RV001_RESPONSE.md`. Timestamp: November 12, 2026.
Not done: No Lane S file edited. Did not re-run hosted CI; relied on the PR's green-CI statement (local `make check` is unavailable on this Windows box and clones check out CRLF, which fails two `repository.test.mjs` assertions on `\r\n` vs `\n` — a checkout artifact, not a defect; committed blobs are LF). Freeze (YT-014) still blocked: Q-002/Q-005/Q-006 open, payment and graph gates closed. RV-002 (Shaahid's review of my lane) is not independent — he authored most of those files — and is tracked as RV-012 for me to fix, not approved here.
How to verify: On `origin/architect/xr-fixes`, read the three review docs; `node` count of operations = 24; `Error.code` enum includes `graph_gate_blocked` and `insufficient_sender_balance`; `Plan.rationaleKey` replaces `rationale`; `potCentsVerified` present; `Turn.state` has no `skipped`.
Risks / gotchas: PR #4 must merge to `main` with green hosted CI before RV-002..RV-006 move to DONE — none of the fixes are on `main` yet (PR #3 merged to the wrong base). The OSS-reviewer run did not satisfy the independent-review gate; cross-lane human review remains the path. Nothing pushed; all my changes are local on `alan-branch1`.
Next step: Shaahid merges PR #4 and records RV-010/RV-011. I pick up RV-012 (fix my Lane A docs for the Payouts/graph-gate drift) and RV-008 (the US-002 vs B-03 counting contradiction) in Lane A.

### Handoff US-201: product-designer (Vid) → frontend (Alan), accessibility (US-204), reviewer

Done: `apps/web/src/styles/tokens.css` holds the Unspoken tokens: layout 360–430 px, 44/48 px targets, palette, rem type scale, spacing, shape, elevation and a base motion scale that drops to 0 ms under reduced motion. `docs/02-design/DESIGN_SYSTEM.md` is rewritten for Unspoken, replacing the YourTurn circles, pot and graph. It covers principles, layout, touch, colour with computed contrast, typography, focus, a 22-component inventory and a never-build list. `tests/design-tokens.test.mjs` recomputes contrast for 38 pairs from the CSS. It also fails if any token other than `--color-paypal-line` holds PayPal blue or a saturated blue, and it checks the 360/430 px and 44 px floors, rem type, the reduced-motion zeroing, and that every colour token is documented.
Not done: No screen is built (US-202 specifies them; Alan builds them). The PayPal brand value `#0070BA` is a placeholder that still needs checking against PayPal's brand guidance. Dark mode is out of scope. Design stances on Q-011 #1/#2/#5/#6/#14/#16 and Q-013 are provisional and listed in the doc. Dependency US-001 is not done; tokens do not depend on the contract (STATUS.md "Next" item 3).
How to verify: `npm run check` (62 tests pass locally). Mutation check: setting `--color-ink-muted` to `#9a9790` makes the contrast test fail at 2.79:1.
Risks / gotchas: The contrast figures measure the palette, not the product; conformance is US-204. Content Designer owns the final strings, and the quoted copy is intent only.
Next step: Independent review. Alan consumes `tokens.css` in `apps/web`, and US-202 specifies the 23 screens on top of it.

### Handoff US-202: product-designer (Vid) → frontend (Alan), content-designer, accessibility (US-204), reviewer

Done: `docs/02-design/FLOWS.md` is rewritten for Unspoken, replacing YourTurn S-01 to S-09. It specifies all 23 screens from the spec's page map, P1–P23, each with layout, actions, rules and a Loading / Empty / Error / Refused state table, and cites the spec page. It also covers eight global rules (44px targets, no hover-only affordance, private versus pod, no reasons on the pod side, honest "Simulated booking" and "Sandbox — no real money" labels, offline, screen-reader announcements), the navigation map with the hub-entry placement decision, and a cross-screen edge-case table. `tests/design-flows.test.mjs` checks that all 23 screens appear exactly once with all four states and a spec page, that the global rules are stated, that no "budget-friendly" or "why this one" label appears except as a prohibition, and that private styling stays on P4/P19/P22/P23.
Not done: No screen is built (Alan, US-101–US-105). Strings are intent only (Content Designer). States are named by what the member sees, because US-001 has no error codes yet; they need mapping once the contract lands. Q-011 #1/#2/#5/#6/#11/#14/#16 and Q-013 stances are provisional and marked inline.
How to verify: `npm run check`. Mutation check: deleting P12's Refused row fails with "P12 is missing its Refused state".
Risks / gotchas: P9/P10 votes show names because the spec requires it; Q-013 still needs Privacy and Behavioral to record that as deliberate. Hub-entry placement (bottom-right sheet) is a design choice the spec leaves open.
Next step: Independent review; Alan builds against it; US-203 specifies the motion moments; US-204 audits the screens once they run.

### Handoff US-203: product-designer (Vid) → frontend (Alan), accessibility (US-204), reviewer

Done: new `docs/02-design/MOTION.md` with eight global motion rules and ten moments from spec p.15. The five required ones (logo turn, bubble drift, card arrival, booking pop, balance thread) are marked ★; the others are bubble birth, bubble-to-chat, rhythm pulse, votes settle and empty-state drawings. Each moment lists its trigger, motion, tokens, **text equivalent** and **reduced-motion equivalent**. `tokens.css` gains nine per-moment `--duration-*` tokens (all `0ms` under reduced motion) and `--ambient-limit: 5s`, so drift and pulse rest within 5 s (WCAG 2.2.2) without needing a new settings control. There is a reference CSS sketch for Frontend. `tests/design-motion.test.mjs` checks the five required moments, a text and reduced-motion equivalent plus a spec page for every moment, that every named token exists and zeroes, and the 5 s ambient limit.
Not done: Logo and line-drawing assets are still to come from the designer. The "drift toward each other when all free" variant is deliberately not designed for the demo: it needs calendar watching and Privacy review. Haptics are not in the spec.
How to verify: `npm run check`. Mutation check: deleting the booking pop's reduced-motion line fails with "Booking pop … reduced motion".
Risks / gotchas: The 5 s ambient rest is a design decision to meet 2.2.2 without adding a P20 setting; the reviewer should confirm it is acceptable.
Next step: Independent review. Alan implements using the tokens, and US-204 verifies reduced motion on built screens.

### Handoff US-204: accessibility (Vid) → frontend (Alan), product-manager, reviewer — PARTIAL, BLOCKED

Done: the **design-stage** audit, in new `docs/02-design/ACCESSIBILITY.md`. It has an evidence table, a 16-row "colour is never the only signal" register, a 36-criterion WCAG 2.2 AA map (Designed / Fixed here / Open / App) and ten findings with owners. Four high and medium findings are fixed in the design here:

- A-03: reflow at 320px, via `--layout-floor`.
- A-04: orientation stays unlocked.
- A-06: focus is not hidden under the dock, via `--scroll-padding-bottom`.
- A-09: the SMS code allows paste and autofill (3.3.8).
  A-05 (map alt text) is also fixed. `tests/accessibility.test.mjs` checks that:
- every colour meaning has a non-colour cue;
- the six WCAG 2.2 additions are mapped;
- the fixes stay in tokens and FLOWS;
- findings carry an owner;
- the doc makes no conformance claim.

Not done: the **app-stage audit** (VoiceOver, TalkBack, keyboard, 320px/200% zoom, reduced motion and rendered contrast on real screens). No screen exists; US-101–US-105 are unclaimed. The acceptance criterion "WCAG 2.2 AA evidence" is therefore only half met, so the task is BLOCKED rather than IN REVIEW. Open: A-07 (2.2.1 deadlines, needs Product Manager sign-off) and A-08 (consistent help).
How to verify: `npm run check` (77 tests pass locally).
Risks / gotchas: designer and auditor are the same person at this stage. The app-stage audit should be run or re-checked by someone else.
Next step: unblocks when Alan's screens run. Then follow the "App-stage audit plan" in ACCESSIBILITY.md and record the results there.

### Handoff US-204 (app stage): accessibility (Vid) → frontend (Alan), reviewer

Done: an app-stage audit of all 19 routes of the built app (PR #53), at 390px and 320px with reduced motion. It used axe-core (WCAG 2.2 A/AA tags), keyboard traversal, reflow at 320px and 200% text, WCAG text spacing, a review of each route's accessibility tree, and a keyboard-only voting walkthrough. There were 11 findings (A-11 to A-21); 9 are fixed in `apps/web`:

- Per-screen document titles (the root metadata title had overwritten them).
- P6 invalid listbox markup.
- P9 votes: now a changeable, single-choice `aria-pressed` toggle, labelled "Vote for <option>", showing first names instead of ids.
- Faded-text contrast (3.44:1).
- Balance chips are no longer live regions, and the lock badge carries the spec text.
- A global reduced-motion rule, plus instant chat scroll under reduce.
- The P22 header badge overflow.
- Home's broken `/hub/money` link.
- 44px Terms/Privacy targets.
- Scroll padding so focus is never hidden.

After the fixes: 0 axe violations, 19/19 titles, 0 targets under 44px, 0 overflow, 0 clipped text. Results are recorded in `docs/02-design/ACCESSIBILITY.md`. `tests/a11y/app-audit.mjs` is the manual retest tool, and `tests/web-accessibility.test.mjs` (in `npm test`) guards the fixes; all 6 of its tests fail on the pre-fix code.
Not done: a hands-on VoiceOver and TalkBack pass on real devices (15 minutes, ideally by someone other than the designer). Open: A-07 (Product Manager), A-08 (Product Manager), A-10 (Frontend, once US-007 streaming lands) and A-14 (Frontend, card headings).
How to verify: `npm run check`; then follow `tests/a11y/app-audit.mjs` to re-run the browser audit (it exits non-zero on any problem).
Risks / gotchas: the fixes touch Alan's `apps/web` files, so Frontend must approve before merge (ROSTER: Accessibility fixes go through a scoped PR). The designer and the auditor are the same person.
Next step: Alan reviews and approves the `apps/web` changes; a reviewer approves; a human runs the device screen-reader pass before the demo is recorded.

### Handoff US-205: product-designer (Vid) → frontend (Alan), reviewer

Done: design QA of every page P1–P23 of the built app. The PDF has no mockups, so each rendered screen (390px) was compared against the spec's page content, FLOWS.md and the tokens; the record is `docs/02-design/DESIGN_QA.md`. Fixed:

- **Tokens wired into the app:** `globals.css` imports `tokens.css` and aliases the old names. This ends the saturated-blue fills.
- **16 hard-coded colours** replaced with tokens.
- **Status chips** gain shapes; destructive buttons become outlines.
- **Developer and spec notes** removed from screens.
- **Sandbox and private surfaces** applied.
- **P1:** splash on paper with the logo turn.
- **P5:** a bottom dock and a hub sheet reaching all seven hub pages, with the private-ask dot on Hub and pastel bubbles.
- **P11:** per-member ready-check answers.
- **P12:** the missing "Simulated booking" label.
- **P14:** the button had marked a balance Paid on a 1.5 s timer; it is now disabled while the gate is closed.
- **P20:** the YourTurn "connection-strength tracking" and other controls removed; exactly the four contract notification switches; privacy explanation; Log out.
- **P22:** equal-weight stretch answers.
- **P4:** step 4 and 6 fixes.

`tests/web-design-qa.test.mjs` (9 tests) guards these; 7 of the 8 code tests fail on the pre-fix code. The browser audit is still clean on all 19 routes.
Not done (recorded with owners in DESIGN_QA.md): P7 demo controls behind a flag; poll closing times; P15 filter and history; P17 map, save and add-to-calendar; P18 week/month and per-calendar consent switch; P22 expiry line and limit chips; P23 one-tap rating; the unbuilt motion. All are Frontend's. Final logo art is the Designer's.
How to verify: `npm run check`; screenshots via `tests/a11y/app-audit.mjs`.
Risks / gotchas: this edits Alan's `apps/web` screens, so Frontend must approve. The legacy variable aliases in `globals.css` keep old class names working; new code should use the token names.
Next step: Alan reviews and approves, then picks up the recorded deviations; a reviewer approves.

### Handoff US-003: backend (Vid) → reviewer (Rohan), backend routes (US-019)

Done: `services/api/src/subscription.mjs` implements the contract's subscription operations as domain functions:

- **Submit and restore:** sandbox receipt verification through a `ReceiptVerifier` port. Anything that is not a sandbox receipt for the $15 monthly product is `422 receipt_invalid` and writes nothing. A retry with the same receipt is idempotent, and a purchase held by another account is refused.
- **Plan status:** `none/active/in_grace/expired`, derived at read time from append-only receipts.
- **`startHangout`:** where the plan check gates the planner (`404` for non-members, then `409 subscription_required`, then `409 pod_too_small`).
- **Tests:** `tests/subscription.test.mjs` (10). Also `docs/03-architecture/SUBSCRIPTION.md`, and the variable name `UNSPOKEN_SANDBOX_RECEIPT_KEY` in `.env.example`.

Not done: a real App Store or Play sandbox verifier. The default is an HMAC-signed local stand-in, and the doc says so. No HTTP routes (US-019). `revoked` is never produced (it needs store server notifications). The grace period (3 days) is a proposal. Q-011.1 and Q-011.2 stay open; the contract defaults are used.
How to verify: `npm run check`; `node --test tests/subscription.test.mjs`.
Risks / gotchas: the plan check uses the **caller's** plan, per the Q-011.1 default. If one member covers the pod, `requirePlannerEnabled` changes to a pod-level check.
Next step: Rohan reviews (the reassignment note names him as reviewer for US-003, US-011 and US-012); US-019 exposes the routes.

### Handoff US-011: backend (Vid) → reviewer (Rohan), US-012, US-019

Done: `services/api/src/calendar.mjs` covers:

- **Connect:** Google Calendar connect with scopes exactly `freebusy.read` and `events.write`, and a signed, member-bound OAuth state that expires.
- **Consent:** per calendar and off by default; the owner can list, set, or disconnect (revoking the credential). Another member gets `404`.
- **Planner check:** `slotsThatFitPod` reads only consented calendars and returns only the fitting slots, plus the members to ask privately.
- **Booking writes:** `blockBookedHangout` writes once per yes-member after booking.
- **Own view:** `getOwnCalendar` shows busy blocks without titles, plus booked hangouts.
- **Catalog events:** `addEventToOwnCalendar`.
- **Revoked grants:** a rejected credential marks the account `needs_reconnect`.

Tests: `tests/calendar.test.mjs` (9), including a fake Google whose private titles must never leak. Docs: `docs/03-architecture/CALENDAR.md`, and variable names in `.env.example`.
Not done: a real Google adapter (the default provider refuses to connect), and HTTP routes (US-019). Apple and Outlook come after the demo.
How to verify: `npm run check`; `node --test tests/calendar.test.mjs`.
Risks / gotchas: `slotsThatFitPod` returns `askPrivately` member ids to the planner only. They must never be shown to the pod, or they would reveal who has no calendar connected.
Next step: Rohan reviews. US-012 calls `blockBookedHangout` after BOOKED.

### Handoff US-012: backend (Vid) → reviewer (Rohan), behavioral-scientist + content-designer (reminder cadence), US-019

Done: `services/api/src/booking.mjs` covers:

- **Booking card:** `runBookingJobs` opens it after the ready check (head count = yeses; estimate = per-person × head count).
- **`volunteerAsPayer`:** a yes-member with linked PayPal; the first volunteer wins.
- **`confirmBooking`:** payer only, bound to the card's estimate, moving the hangout to BOOKING.
- **The simulated booking:** the seeded-venue booker, labelled with the contract's exact `simulatedLabel`. It leads to BOOKED, with yes-members' calendars blocked through US-011, or to BOOKING_FAILED with a `next_best` offer card and no reason given.
- **Reminders:** private only (planner chat plus a push pointer), one interval after the card, then once per interval, capped at 3.

Migration 3 rebuilds `reminder_sent` to add the `booking_confirmation_needed` kind (append-only kept). Tests: `tests/booking.test.mjs` (9). Docs: `docs/03-architecture/BOOKING.md`, plus the DATA_MODEL migration list.
Not done: real reservations and organizer outreach (not built, not claimed); payer drop-out (decision 19, Q-014); HTTP routes (US-019).
How to verify: `npm run check`; `node --test tests/booking.test.mjs`.
Risks / gotchas: the reminder cadence (24h, at most 3) is a proposal needing Behavioral and Content approval, and the US-013 send gate holds pushes until then. `volunteerAsPayer` lives here because `confirmBooking` cannot pass its guard without a payer; move it if the money lane prefers.
Next step: Rohan reviews; Behavioral and Content approve the cadence and copy; US-019 exposes the routes and schedules `runBookingJobs`.

### Handoff RV-009: privacy (Alan) → reviewer / Shaahid / Legal

Done: Filled the `docs/05-risk/PRIVACY.md` stub with Phase 1 privacy decisions for XR-08, XR-16, XR-17, XR-22. Timestamp: November 12, 2026.

- **ADR 0007 impact section:** Records that Q-002 is MOOT (no graph exists in Unspoken), "connection tracking" consent (US-007/US-008) is gone from the product, and custody Q-006 is moot on the main payment path.
- **XR-16 (prospective consent):** Calendar consent is prospective only — the planner reads availability from the grant timestamp forward; no historical calendar data is processed or retained. Requires the architect to pass consent timestamp as a lower bound on free/busy queries.
- **XR-17 (withdrawal invalidates plans):** Revoking calendar consent marks shortlist options derived from that member's availability as stale via `derived_from_member_ids`. Approved plans require re-approval; already-booked hangouts are unaffected. "Derived from" means the slot was feasible because the member was free.
- **XR-08 (peer pause visibility):** A paused member's peer-visible state is their normal "joined" state — no hardship marker or "paused" label. `participationStateVisibility: policy_pending` in the contract is the correct holding state until Q-006 resolves.
- **XR-22 (invited/left visibility):** Invited members are shown as `pendingInvitationCount` only (no names). Left members are removed from the list with no announcement.
- **Open items:** PV-01 through PV-07 are filed for Legal + Q-006 resolution (collection effect of pause, vault deletion, post-exit access scope, lawful basis, poll vote names, multi-member staleness cascade).

Not done: Lawful basis and regulatory review (PV-05) — requires Legal counsel. PV-01/PV-02 (pause collection effects and resulting peer-visible state) — blocked on Q-006, Payments, Legal.

How to verify: `npm test` (357/358 pass locally; 1 pre-existing Windows-only failure in `tests/web-accessibility.test.mjs` — unrelated to these changes; passes on hosted Linux CI). Read `docs/05-risk/PRIVACY.md` against PHASE1_CONTRACT_CROSS_REVIEW.md XR-08/XR-16/XR-17/XR-22.

Risks / gotchas: `docs/05-risk/PRIVACY.md` is not in Alan's declared lane path (`docs/01-product/` and `docs/04-behavioral/`); however, RV-009 explicitly assigns it to Alan and Shaahid owns only `THREAT_MODEL.md` and `COMPLIANCE.md` within `docs/05-risk/`. Confirm ownership with Shaahid if needed. The PRIVACY.md decisions do not resolve Q-006 — they record what is structurally decided and explicitly flag what still needs Legal/human input.

Next step: Shaahid reviews and merges `privacy/rv-009-privacy-decisions`. Legal/Payments address PV-01 to unblock PV-02. Alan has no further unclaimed tasks in Lane A.

## Human Phase 1 authorization and coordinated ownership

The human explicitly authorized Phase 1 after approving the private push and main promotion. This authorizes drafting/reviewing contracts and designs while YT-006 and the residual YT-007 readiness conditions stay BLOCKED. It does not claim sandbox success, waive RULES, approve a money-flow change, authorize real-user research, freeze unresolved contracts or start Phase 2.

YT-008 through YT-013 are drafted and merged to `main` by fast-forward on the human's explicit instruction; independent agent review of these documents did not run and was **waived by the human**, not satisfied, so they remain IN REVIEW for Shaahid/Alan cross-review.YT-014 reconciliation and freeze stays in TODO and remains blocked while Q-001, Q-002 and Q-006 are open. Human ownership of every row is recorded in Claimed by and summarised under "Two-person split: Shaahid and Alan". No agent may close a task, merge to main or open the payment gate.

Scoped governance coordination under YT-007: Orchestrator handles board/status/roster; parent acts as Tech Writer for AGENTS.md, README.md and context authorization notes, QA for tests/repository.test.mjs and new contract document checks, and SRE only for root tooling needed to validate contract artifacts. No RULES.md edits. These are named limited shared-path assignments, not standing ownership. Every role must consult this authorization before treating static Phase 0 text as current status.

Contract coordination baseline (draft decisions, not approved payment policy): USD integer cents; exactly three suggested plans or explicit unavailability; no LLM payment authority; only deterministic explicit host approval can progress a future order; synthetic graph only and no real-person numeric scores; private pause reasons never collected/disclosed; consent withdrawal excludes incident edges; no Payouts/refunds/real money/automated venue reservation claims. Phase 1 makes uncertainties explicit rather than inventing policy.

Bootstrap handoffs above are historical snapshots; this authorization and the updated STATUS.md supersede their old statements about missing remote/CI/main approval. Remaining sandbox, policy and freeze blockers still apply.
