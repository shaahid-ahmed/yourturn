# YourTurn task board

Single source of task state. Phase 0 scaffold only; **Phase 1 is NOT authorized**. See STATUS.md and HANDOFF.md. `∥` marks tasks that can run in parallel **after their dependencies and phase gate clear**, not tasks ready now. Completed local artifacts stay IN REVIEW until the global DoD, including hosted CI and independent review, passes. No task is falsely marked DONE.

The user requested initial scaffold creation across the tree. Orchestrator coordinated Architect/SRE/Tech Writer/Behavioral roles for that one-time bootstrap; this grants no ongoing cross-path access. Bootstrap uses `orchestrator/bootstrap`, never a merge to main. Claim/handoff/question edits to your own row are the limited collaboration exception in ROSTER.md. New claims on separate machines require shared-board/coordinator acknowledgement.

## TODO

| ID     | Title                                                  | Role                 | Depends on                                     | Acceptance criteria                                                                                                                                             | Claimed by | Branch/PR |
| ------ | ------------------------------------------------------ | -------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------- |
| YT-008 | ∥ Phase 1: PRD, stories and metric intent              | product-manager      | YT-007                                         | PRD scope, testable stories, consent/exit/pause criteria and metric intent for Data; reconcile in YT-014                                                        | Unclaimed  | —         |
| YT-009 | ∥ Phase 1: draft API, schema and architecture          | architect            | YT-007                                         | Contract-first draft, authz, ledger/rotation/consent invariants and shared-type generation plan; reconcile PRD in YT-014                                        | Unclaimed  | —         |
| YT-010 | ∥ Phase 1: review behavioral baseline and gates        | behavioral-scientist | YT-007                                         | Review all eight rules, claim register and gate process; document decisions, not assumed sign-off                                                               | Unclaimed  | —         |
| YT-011 | ∥ Phase 1: flows and design system                     | product-designer     | YT-007                                         | Draft onboarding, host approval, private pause, two-tap exit and synthetic graph; non-color cues; reconcile in YT-014                                           | Unclaimed  | —         |
| YT-012 | ∥ Phase 1: consented UX research plan and findings     | ux-researcher        | YT-007; human participant/research consent     | Research section only; real interviews if approved, otherwise clearly untested hypotheses; no invented participants                                             | Unclaimed  | —         |
| YT-013 | Phase 1: voice, disclosure and notification copy       | content-designer     | YT-008, YT-010, YT-011                         | No guilt copy; strings and notifications jointly reviewed with Behavioral; claims correctly qualified                                                           | Unclaimed  | —         |
| YT-014 | Phase 1: reconcile and freeze contracts                | architect            | YT-008, YT-009, YT-010, YT-011, YT-012, YT-013 | Reconcile PRD/design/research, approve API/data model and generation schema via ADR; resolve blocking questions with owners; human money-flow approval recorded | Unclaimed  | —         |
| YT-015 | ∥ Phase 2: circles, membership and host rotation       | backend              | YT-014                                         | TDD API/persistence; 3–6 members; deterministic rotation; join/leave/pause/authz cases; docs match contract                                                     | Unclaimed  | —         |
| YT-016 | Phase 2: ledger and verified webhook ingress           | backend              | YT-015, YT-023, YT-025                         | Integer cents, atomic derived balance, verified ingress before effects, replay/out-of-order/concurrency tests; money branches 100%                              | Unclaimed  | —         |
| YT-017 | ∥ Phase 2: PayPal sandbox integration                  | payments             | YT-014, YT-023, YT-025, YT-006                 | Subscriptions, Orders/capture, verification helpers, deterministic host approval and reconciliation; provider readback; money branches 100%; approved flow only | Unclaimed  | —         |
| YT-018 | ∥ Phase 2: histories, venues, event schema and metrics | data-analytics       | YT-014, YT-024                                 | Synthetic Sam/Priya fading history, fixed venues, repeatable seed, metric guardrails and no real personal data                                                  | Unclaimed  | —         |
| YT-019 | Phase 2: tie strength and drift heuristics             | ml-engineer          | YT-018, YT-024                                 | Consented-input policy, bounded 0–1 internal scoring, deterministic evals incl. missingness/withdrawal; no accuracy claims; results to Architect                | Unclaimed  | —         |
| YT-020 | Phase 2: three-plan host copilot                       | llm-engineer         | YT-018, YT-024                                 | Schema-valid exactly-three-plan JSON; bounded retry, budget/venue checks, minimized prompts, no payment tools; evals recorded                                   | Unclaimed  | —         |
| YT-021 | ∥ Phase 2: frontend against approved contract mocks    | frontend             | YT-014                                         | Screens against contract fixtures; host approval, pause/exit/consent, accessible states; no fake live-payment claims                                            | Unclaimed  | —         |
| YT-022 | Phase 2: integrate real API, copilot and graph         | frontend             | YT-016, YT-017, YT-019, YT-020, YT-021         | Full approved path; synthetic graph labelled; distinct failure/pending/success; no claim of booking from capture alone                                          | Unclaimed  | —         |
| YT-023 | ∥ Phase 2: security threat/control review              | security             | YT-014                                         | Authz, tenant leakage, webhook verification/replay, secret exposure and prompt injection mapped to owner tests                                                  | Unclaimed  | —         |
| YT-024 | ∥ Phase 2: privacy and graph visibility decision       | privacy              | YT-014                                         | Minimized inventory, consent/withdrawal/deletion, third-party access, confidential hardship; Q-002 resolution with Behavioral/Designer/human                    | Unclaimed  | —         |
| YT-025 | ∥ Phase 2: legal/compliance risk assessment            | legal-compliance     | YT-014                                         | Sourced review of actual flow, pooled funds, PayPal terms, forfeit/cancellation/refund and gambling-adjacent questions; unresolved risks block flow             | Unclaimed  | —         |
| YT-026 | ∥ Phase 2: abuse and coercion assessment               | trust-safety         | YT-014                                         | Host misuse, exclusion, harassment, financial coercion and safe exit scenarios with mitigation/test owners                                                      | Unclaimed  | —         |
| YT-027 | ∥ Phase 2: market and positioning                      | growth-market        | YT-014                                         | Dated primary sources, sourced sizing and competitor comparisons; ethical revenue hypotheses; no invented traction                                              | Unclaimed  | —         |
| YT-028 | Phase 3: demo e2e and negative-path suite              | qa                   | YT-022, YT-026                                 | Real sandbox path with evidence plus failed payment, duplicate webhook, stale host, leave/pause/consent cases; no mocks counted as sandbox proof                | Unclaimed  | —         |
| YT-029 | ∥ Phase 3: accessibility audit and scoped fixes        | accessibility        | YT-022                                         | WCAG 2.2 AA criterion evidence; keyboard/screen-reader/reduced-motion checks and graph non-color alternative; retest fixes                                      | Unclaimed  | —         |
| YT-030 | ∥ Phase 3: behavioral release review                   | behavioral-scientist | YT-022, YT-024, YT-026                         | Revision-bound checklist/sign-off; notifications dual-approved; no real public scores, shame or coercion                                                        | Unclaimed  | —         |
| YT-031 | Phase 3: independent integration review                | reviewer             | YT-028, YT-029, YT-030                         | Non-author review, green CI, money branch coverage and AI eval evidence; security/risk blockers resolved; comments only                                         | Unclaimed  | —         |
| YT-032 | Phase 3: approved sandbox demo deployment              | sre-devops           | YT-031; human deployment approval              | Approved environment only, secrets isolated, health/reset/recovery verified; no production money or unapproved billable resources                               | Unclaimed  | —         |
| YT-033 | Phase 4: synthetic graph animation polish              | frontend             | YT-031                                         | Labelled synthetic red-to-green change, text/icon signal and reduced motion; no new product scope; review again after changes                                   | Unclaimed  | —         |
| YT-034 | ∥ Phase 4: pitch, slides and demo script               | demo-pitch           | YT-027, YT-031                                 | Sourced claims, three-minute script, slide/video storyboard, honest payment/fallback labels and failure path                                                    | Unclaimed  | —         |
| YT-035 | ∥ Phase 4: README and handoff refresh                  | tech-writer          | YT-032                                         | Fresh-clone instructions exercised, actual demo link, Legal-approved disclaimer and exact limitations; no scaffold-as-product claims                            | Unclaimed  | —         |
| YT-036 | Phase 4: rehearsal and recorded backup                 | demo-pitch           | YT-032, YT-033, YT-034, YT-035                 | Rehearsal measured under three minutes; backup recording produced and played back; no real personal/secret data                                                 | Unclaimed  | —         |
| YT-037 | Phase 4: final independent review                      | reviewer             | YT-036                                         | Review exact final revision including post-hardening polish/docs; green CI, specialist sign-offs and no unresolved release blockers                             | Unclaimed  | —         |
| YT-038 | Phase 4: final human build approval                    | orchestrator         | YT-037                                         | Human approves exact demo revision and any main merge; preserve evidence and handoffs; no silent release                                                        | Unclaimed  | —         |

## IN PROGRESS

| ID  | Title | Role | Depends on | Acceptance criteria | Claimed by | Branch/PR |
| --- | ----- | ---- | ---------- | ------------------- | ---------- | --------- |

## IN REVIEW

| ID     | Title                                   | Role                 | Depends on                                                     | Acceptance criteria                                                                                                           | Claimed by                                 | Branch/PR                          |
| ------ | --------------------------------------- | -------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------- |
| YT-001 | Phase 0: repository, rules and board    | orchestrator         | None; user bootstrap authorization                             | All required files, complete governance/context, phase board and day-0 status; no product features; bootstrap commit          | orchestrator, hermes-parent                | orchestrator/bootstrap; local only |
| YT-002 | ∥ Phase 0: architecture and stack ADRs  | architect            | None; user bootstrap authorization                             | ADR 0001/0002 recorded before tooling implementation; provisional choices not fabricated human approval                       | architect, hermes-parent                   | orchestrator/bootstrap; local only |
| YT-003 | ∥ Phase 0: tooling and CI               | sre-devops           | YT-002 selection recorded; setup work may precede ratification | Locked install, setup-only dev, seed, lint, strict typing, tests and secret scan; CI workflow; hosted run remains outstanding | sre-devops, hermes-parent                  | orchestrator/bootstrap; local only |
| YT-004 | ∥ Phase 0: onboarding, roles and roster | tech-writer          | None; user bootstrap authorization                             | All 24 exact role files, eight sections each, specific ownership/handoffs; onboarding commands exercised                      | tech-writer, bootstrap-roles               | orchestrator/bootstrap; local only |
| YT-005 | ∥ Phase 0: behavioral baseline          | behavioral-scientist | None; user bootstrap authorization                             | Complete principles/checklist/research; eight rules preserved; sources and claims bounded; no implied product sign-off        | behavioral-scientist, bootstrap-behavioral | orchestrator/bootstrap; local only |

## DONE

| ID  | Title | Role | Depends on | Acceptance criteria | Claimed by | Branch/PR |
| --- | ----- | ---- | ---------- | ------------------- | ---------- | --------- |

No closed tasks yet: local artifact completion is not the full global DoD.

## BLOCKED

| ID     | Title                            | Role         | Depends on                                                                                                 | Acceptance criteria                                                                                                                                                                             | Claimed by | Branch/PR |
| ------ | -------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------- |
| YT-006 | Phase 0: PayPal sandbox go/no-go | payments     | Human-supplied sandbox credentials, collecting/venue merchants, buyer approval and safe test-flow approval | Real subscription, venue Order/capture with proved funding source, signature-verified webhook and replay/readback evidence; if actual failure, proposed ADR 0003 and explicit fallback decision | Unclaimed  | —         |
| YT-007 | Phase 0: human release gate      | orchestrator | YT-001, YT-002, YT-003, YT-004, YT-005, YT-006; real GitHub owners/remote                                  | Independent review, green hosted CI, initial rules/stack ratification, protected main/merge approval and explicit human Phase 1 authorization; resolve Q-001–Q-005                              | Unclaimed  | —         |

## LATER

Ordered cut list: remove live venue search first, then turn-order optimization, Payouts refunds, memory recap. Never silently cut real sandbox payment, the drift graph demonstration or behavioral safeguards.

| ID     | Title                                | Role         | Depends on                                      | Acceptance criteria                                                                              | Claimed by | Branch/PR |
| ------ | ------------------------------------ | ------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------- | --------- |
| YT-039 | Live venue search — first cut        | llm-engineer | YT-038; new PRD scope/ADR approval              | Verified provider, bounded search and no invented availability; outside current scope            | Unclaimed  | —         |
| YT-040 | Turn-order optimization — second cut | backend      | YT-038; new PRD/behavioral approval             | Fairness eval, no coercion/ranking and updated rotation contract; outside current scope          | Unclaimed  | —         |
| YT-041 | Payouts refunds — third cut          | payments     | YT-038; new legal and human money-flow approval | Approved recipient/refund policy, provider evidence and 100% branch coverage; not authorized now | Unclaimed  | —         |
| YT-042 | Memory recap — fourth cut            | frontend     | YT-038; new PRD/privacy approval                | Opt-in minimized recap with deletion and accessibility; outside current scope                    | Unclaimed  | —         |

## Open questions

- **Q-001 @payments @legal-compliance @architect:** How can subscription proceeds fund a separate venue Order with these accounts and permissions? The ledger is not proof of a provider funding mechanism. Need sandbox accounts and safe-test approval; never claim this is supported or compliant without evidence.
- **Q-002 @privacy @behavioral-scientist @product-designer:** Resolve real-user red/green graph versus private drift/no visible scores, own-data access versus third-party inferences, and host membership in the affected pair. Until approved, graphs are labelled synthetic only and no real-user scores appear. Phase 1 may proceed only with an explicit synthetic-only boundary if the full policy remains unresolved.
- **Q-003 @orchestrator @sre-devops:** Human must supply remote and real authorized GitHub CODEOWNERS; configure branch protection and verify hosted CI. Commented CODEOWNERS mappings do not enforce review. No remote creation/push requested yet.
- **Q-004 @payments @architect @orchestrator:** If venue Order actually fails, propose ADR 0003 fallback with visible simulation label. Reconcile this with never-cut real sandbox payment through explicit human decision. Missing credentials are BLOCKED, not an observed failure; no fallback has been approved.
- **Q-005 @payments @architect @security:** Rule 8 says every PayPal call carries an idempotency key. Document internal operation keys and endpoint-specific provider support/retention; do not infer that every API enforces a supplied header. Any RULES change needs human approval; current rule is unchanged.
- **Q-006 @legal-compliance @payments @privacy @behavioral-scientist:** Define forfeit/cancellation/dispute rights, private hardship pause effects, withdrawal/deletion and own-data access without third-party leakage. Product text is a requirement, not legal approval; record explicit decisions before affected implementations.

## Handoffs

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
