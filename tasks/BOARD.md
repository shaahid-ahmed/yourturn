# YourTurn task board

Single source of task state. **Phase 1 documentation authorized** by the human request "go for phase 1" on November 11, 2026. Product implementation, payment execution and final contract freeze are NOT authorized by that request. See STATUS.md and HANDOFF.md. `∥` marks tasks that can run in parallel **after their dependencies and phase gate clear**, not tasks ready now. Completed local artifacts stay IN REVIEW until the global DoD, including hosted CI and independent review, passes. No task is falsely marked DONE.

The user requested initial scaffold creation across the tree. Orchestrator coordinated Architect/SRE/Tech Writer/Behavioral roles for that one-time bootstrap; this grants no ongoing cross-path access. Bootstrap commit `10bc1d7` is now on private GitHub `shaahid-ahmed/yourturn` main following explicit human approval; CI run `43058134382` succeeded. Current integration branch: `orchestrator/phase-1-contracts`. Claim/handoff/question edits to your own row are the limited collaboration exception in ROSTER.md. New claims on separate machines require shared-board/coordinator acknowledgement.

## TODO

| ID     | Title                                                  | Role                 | Depends on                                     | Acceptance criteria                                                                                                                                             | Claimed by                        | Branch/PR |
| ------ | ------------------------------------------------------ | -------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | --------- |
| YT-014 | Phase 1: reconcile and freeze contracts                | architect            | YT-008, YT-009, YT-010, YT-011, YT-012, YT-013 | Reconcile PRD/design/research, approve API/data model and generation schema via ADR; resolve blocking questions with owners; human money-flow approval recorded | Human: Shaahid — Unclaimed        | —         |
| YT-015 | ∥ Phase 2: circles, membership and host rotation       | backend              | YT-014                                         | TDD API/persistence; 3–6 members; deterministic rotation; join/leave/pause/authz cases; docs match contract                                                     | Human: Shaahid — Unclaimed        | —         |
| YT-016 | Phase 2: ledger and verified webhook ingress           | backend              | YT-015, YT-023, YT-025                         | Integer cents, atomic derived balance, verified ingress before effects, replay/out-of-order/concurrency tests; money branches 100%                              | Human: Shaahid — Unclaimed        | —         |
| YT-017 | ∥ Phase 2: PayPal sandbox integration                  | payments             | YT-014, YT-023, YT-025, YT-006                 | Subscriptions, Orders/capture, verification helpers, deterministic host approval and reconciliation; provider readback; money branches 100%; approved flow only | Human: Shaahid — Unclaimed        | —         |
| YT-018 | ∥ Phase 2: histories, venues, event schema and metrics | data-analytics       | YT-014, YT-024                                 | Synthetic Sam/Priya fading history, fixed venues, repeatable seed, metric guardrails and no real personal data                                                  | Human: Alan — Unclaimed           | —         |
| YT-019 | Phase 2: tie strength and drift heuristics             | ml-engineer          | YT-018, YT-024                                 | Consented-input policy, bounded 0–1 internal scoring, deterministic evals incl. missingness/withdrawal; no accuracy claims; results to Architect                | Human: Alan — Unclaimed           | —         |
| YT-020 | Phase 2: three-plan host copilot                       | llm-engineer         | YT-018, YT-024                                 | Schema-valid exactly-three-plan JSON; bounded retry, budget/venue checks, minimized prompts, no payment tools; evals recorded                                   | Human: Alan — Unclaimed           | —         |
| YT-021 | ∥ Phase 2: frontend against approved contract mocks    | frontend             | YT-014                                         | Screens against contract fixtures; host approval, pause/exit/consent, accessible states; no fake live-payment claims                                            | Human: Alan — Unclaimed           | —         |
| YT-022 | Phase 2: integrate real API, copilot and graph         | frontend             | YT-016, YT-017, YT-019, YT-020, YT-021         | Full approved path; synthetic graph labelled; distinct failure/pending/success; no claim of booking from capture alone                                          | Human: Shaahid & Alan — Unclaimed | —         |
| YT-023 | ∥ Phase 2: security threat/control review              | security             | YT-014                                         | Authz, tenant leakage, webhook verification/replay, secret exposure and prompt injection mapped to owner tests                                                  | Human: Shaahid — Unclaimed        | —         |
| YT-024 | ∥ Phase 2: privacy and graph visibility decision       | privacy              | YT-014                                         | Minimized inventory, consent/withdrawal/deletion, third-party access, confidential hardship; Q-002 resolution with Behavioral/Designer/human                    | Human: Alan — Unclaimed           | —         |
| YT-025 | ∥ Phase 2: legal/compliance risk assessment            | legal-compliance     | YT-014                                         | Sourced review of actual flow, pooled funds, PayPal terms, forfeit/cancellation/refund and gambling-adjacent questions; unresolved risks block flow             | Human: Shaahid — Unclaimed        | —         |
| YT-026 | ∥ Phase 2: abuse and coercion assessment               | trust-safety         | YT-014                                         | Host misuse, exclusion, harassment, financial coercion and safe exit scenarios with mitigation/test owners                                                      | Human: Alan — Unclaimed           | —         |
| YT-027 | ∥ Phase 2: market and positioning                      | growth-market        | YT-014                                         | Dated primary sources, sourced sizing and competitor comparisons; ethical revenue hypotheses; no invented traction                                              | Human: Alan — Unclaimed           | —         |
| YT-028 | Phase 3: demo e2e and negative-path suite              | qa                   | YT-022, YT-026                                 | Real sandbox path with evidence plus failed payment, duplicate webhook, stale host, leave/pause/consent cases; no mocks counted as sandbox proof                | Human: Shaahid — Unclaimed        | —         |
| YT-029 | ∥ Phase 3: accessibility audit and scoped fixes        | accessibility        | YT-022                                         | WCAG 2.2 AA criterion evidence; keyboard/screen-reader/reduced-motion checks and graph non-color alternative; retest fixes                                      | Human: Alan — Unclaimed           | —         |
| YT-030 | ∥ Phase 3: behavioral release review                   | behavioral-scientist | YT-022, YT-024, YT-026                         | Revision-bound checklist/sign-off; notifications dual-approved; no real public scores, shame or coercion                                                        | Human: Alan — Unclaimed           | —         |
| YT-031 | Phase 3: independent integration review                | reviewer             | YT-028, YT-029, YT-030                         | Non-author review, green CI, money branch coverage and AI eval evidence; security/risk blockers resolved; comments only                                         | Human: Shaahid & Alan — Unclaimed | —         |
| YT-032 | Phase 3: approved sandbox demo deployment              | sre-devops           | YT-031; human deployment approval              | Approved environment only, secrets isolated, health/reset/recovery verified; no production money or unapproved billable resources                               | Human: Shaahid — Unclaimed        | —         |
| YT-033 | Phase 4: synthetic graph animation polish              | frontend             | YT-031                                         | Labelled synthetic red-to-green change, text/icon signal and reduced motion; no new product scope; review again after changes                                   | Human: Alan — Unclaimed           | —         |
| YT-034 | ∥ Phase 4: pitch, slides and demo script               | demo-pitch           | YT-027, YT-031                                 | Sourced claims, three-minute script, slide/video storyboard, honest payment/fallback labels and failure path                                                    | Human: Alan — Unclaimed           | —         |
| YT-035 | ∥ Phase 4: README and handoff refresh                  | tech-writer          | YT-032                                         | Fresh-clone instructions exercised, actual demo link, Legal-approved disclaimer and exact limitations; no scaffold-as-product claims                            | Human: Shaahid — Unclaimed        | —         |
| YT-036 | Phase 4: rehearsal and recorded backup                 | demo-pitch           | YT-032, YT-033, YT-034, YT-035                 | Rehearsal measured under three minutes; backup recording produced and played back; no real personal/secret data                                                 | Human: Shaahid & Alan — Unclaimed | —         |
| YT-037 | Phase 4: final independent review                      | reviewer             | YT-036                                         | Review exact final revision including post-hardening polish/docs; green CI, specialist sign-offs and no unresolved release blockers                             | Human: Shaahid & Alan — Unclaimed | —         |
| YT-038 | Phase 4: final human build approval                    | orchestrator         | YT-037                                         | Human approves exact demo revision and any main merge; preserve evidence and handoffs; no silent release                                                        | Human: Shaahid — Unclaimed        | —         |

## IN PROGRESS

| ID  | Title | Role | Depends on | Acceptance criteria | Claimed by | Branch/PR |
| --- | ----- | ---- | ---------- | ------------------- | ---------- | --------- |

## IN REVIEW

| ID     | Title                                              | Role                 | Depends on                                                                                                                        | Acceptance criteria                                                                                                      | Claimed by                                            | Branch/PR                      |
| ------ | -------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------ |
| YT-008 | ∥ Phase 1: PRD, stories and metric intent          | product-manager      | YT-001, YT-002, YT-003, YT-004, YT-005; explicit human Phase 1 document authorization                                             | PRD scope, testable stories, consent/exit/pause criteria and metric intent for Data; reconcile in YT-014                 | Human: Alan — product-manager, phase1-product         | orchestrator/phase-1-contracts |
| YT-009 | ∥ Phase 1: draft API, schema and architecture      | architect            | YT-001, YT-002, YT-003, YT-004, YT-005; explicit human Phase 1 document authorization                                             | Contract-first draft, authz, ledger/rotation/consent invariants and shared-type generation plan; reconcile PRD in YT-014 | Human: Shaahid — architect, phase1-architect          | orchestrator/phase-1-contracts |
| YT-010 | ∥ Phase 1: review behavioral baseline and gates    | behavioral-scientist | YT-001, YT-002, YT-003, YT-004, YT-005; explicit human Phase 1 document authorization                                             | Review all eight rules, claim register and gate process; document decisions, not assumed sign-off                        | Human: Alan — behavioral-scientist, phase1-behavioral | orchestrator/phase-1-contracts |
| YT-011 | ∥ Phase 1: flows and design system                 | product-designer     | YT-001, YT-002, YT-003, YT-004, YT-005; explicit human Phase 1 document authorization                                             | Draft onboarding, host approval, private pause, two-tap exit and synthetic graph; non-color cues; reconcile in YT-014    | Human: Alan — product-designer, phase1-design         | orchestrator/phase-1-contracts |
| YT-012 | ∥ Phase 1: consented UX research plan and findings | ux-researcher        | YT-001, YT-002, YT-003, YT-004, YT-005; explicit human Phase 1 document authorization; research plan only, no participant contact | Research section only; real interviews if approved, otherwise clearly untested hypotheses; no invented participants      | Human: Alan — ux-researcher, phase1-product           | orchestrator/phase-1-contracts |
| YT-013 | Phase 1: voice, disclosure and notification copy   | content-designer     | YT-008, YT-010, YT-011                                                                                                            | No guilt copy; strings and notifications jointly reviewed with Behavioral; claims correctly qualified                    | Human: Alan — content-designer, phase1-content        | orchestrator/phase-1-contracts |

## DONE

| ID     | Title                                   | Role                 | Depends on                                                     | Acceptance criteria                                                                                                    | Claimed by                                               | Branch/PR                      |
| ------ | --------------------------------------- | -------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------ |
| YT-001 | Phase 0: repository, rules and board    | orchestrator         | None; user bootstrap authorization                             | All required files, complete governance/context, phase board and day-0 status; no product features; bootstrap commit   | Human: Shaahid — orchestrator, hermes-parent             | main @ 10bc1d7; CI 43058134382 |
| YT-002 | ∥ Phase 0: architecture and stack ADRs  | architect            | None; user bootstrap authorization                             | ADR 0001/0002 recorded before tooling implementation; provisional choices not fabricated human approval                | Human: Shaahid — architect, hermes-parent                | main @ 10bc1d7; CI 43058134382 |
| YT-003 | ∥ Phase 0: tooling and CI               | sre-devops           | YT-002 selection recorded; setup work may precede ratification | Locked install, setup-only dev, seed, lint, strict typing, tests and secret scan; CI workflow; hosted run succeeded    | Human: Shaahid — sre-devops, hermes-parent               | main @ 10bc1d7; CI 43058134382 |
| YT-004 | ∥ Phase 0: onboarding, roles and roster | tech-writer          | None; user bootstrap authorization                             | All 24 exact role files, eight sections each, specific ownership/handoffs; onboarding commands exercised               | Human: Shaahid — tech-writer, bootstrap-roles            | main @ 10bc1d7; CI 43058134382 |
| YT-005 | ∥ Phase 0: behavioral baseline          | behavioral-scientist | None; user bootstrap authorization                             | Complete principles/checklist/research; eight rules preserved; sources and claims bounded; no implied product sign-off | Human: Alan — behavioral-scientist, bootstrap-behavioral | main @ 10bc1d7; CI 43058134382 |

Bootstrap artifact tasks closed on verified review, hosted CI and human main promotion. This does not close YT-006 or the residual YT-007 readiness gate.

## BLOCKED

| ID     | Title                            | Role         | Depends on                                                                                                 | Acceptance criteria                                                                                                                                                                             | Claimed by                 | Branch/PR |
| ------ | -------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------- |
| YT-006 | Phase 0: PayPal sandbox go/no-go | payments     | Human-supplied sandbox credentials, collecting/venue merchants, buyer approval and safe test-flow approval | Real subscription, venue Order/capture with proved funding source, signature-verified webhook and replay/readback evidence; if actual failure, proposed ADR 0003 and explicit fallback decision | Human: Shaahid — Unclaimed | —         |
| YT-007 | Phase 0: human release gate      | orchestrator | YT-001, YT-002, YT-003, YT-004, YT-005, YT-006; real GitHub owners/remote                                  | Independent review, green hosted CI, initial rules/stack ratification, protected main/merge approval and explicit human Phase 1 authorization; resolve Q-001–Q-005                              | Human: Shaahid — Unclaimed | —         |

## LATER

Ordered cut list: remove live venue search first, then turn-order optimization, Payouts refunds, memory recap. Never silently cut real sandbox payment, the drift graph demonstration or behavioral safeguards.

| ID     | Title                                | Role         | Depends on                                      | Acceptance criteria                                                                              | Claimed by                 | Branch/PR |
| ------ | ------------------------------------ | ------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------- | --------- |
| YT-039 | Live venue search — first cut        | llm-engineer | YT-038; new PRD scope/ADR approval              | Verified provider, bounded search and no invented availability; outside current scope            | Human: Alan — Unclaimed    | —         |
| YT-040 | Turn-order optimization — second cut | backend      | YT-038; new PRD/behavioral approval             | Fairness eval, no coercion/ranking and updated rotation contract; outside current scope          | Human: Shaahid — Unclaimed | —         |
| YT-041 | Payouts refunds — third cut          | payments     | YT-038; new legal and human money-flow approval | Approved recipient/refund policy, provider evidence and 100% branch coverage; not authorized now | Human: Shaahid — Unclaimed | —         |
| YT-042 | Memory recap — fourth cut            | frontend     | YT-038; new PRD/privacy approval                | Opt-in minimized recap with deletion and accessibility; outside current scope                    | Human: Alan — Unclaimed    | —         |

## Two-person split: Shaahid and Alan

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

| #   | Touchpoint                               | Direction                                           | How to keep it cheap                                                                                                               |
| --- | ---------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| T1  | **YT-014 contract freeze**               | Alan's Phase 1 drafts → Shaahid freezes             | Alan builds against `openapi.json` v0.1.0-draft immediately; freeze changes types, not whether work can start                      |
| T2  | **Fixture schema** (YT-018)              | Alan produces → Shaahid consumes in YT-016/YT-028   | Fixture shape is agreed once at freeze and versioned (`fixtureRevision`); Shaahid never edits fixtures, Alan never edits API tests |
| T3  | **YT-022 integration**                   | Joint, Alan leads the UI side, Shaahid the API side | Frontend already works against mocks, so integration is a swap of base URL plus error-state verification                           |
| T4  | **YT-031 / YT-037 cross-review**         | Each reviews the other's lane                       | Required by rule 19: an author cannot approve their own work. Review comments only, no edits in the other lane                     |
| T5  | **YT-036 rehearsal and YT-038 approval** | Joint, then Shaahid records the human decision      | One scheduled run-through; no code changes during rehearsal                                                                        |

### Rules that keep the lanes independent

1. **Branch prefixes.** Shaahid uses `architect/*`, `backend/*`, `payments/*`, `security/*`, `legal/*`, `qa/*`, `sre-devops/*`, `orchestrator/*`. Alan uses `product-manager/*`, `behavioral-scientist/*`, `product-designer/*`, `content-designer/*`, `ux-researcher/*`, `data-analytics/*`, `ml-engineer/*`, `llm-engineer/*`, `frontend/*`, `privacy/*`, `trust-safety/*`, `growth-market/*`, `accessibility/*`, `demo-pitch/*`.
2. **No cross-lane edits.** Need a change in the other lane? Open a task row and tag the owner; do not edit it yourself, even to fix a build.
3. **Shared files are serialized, not co-edited.** `tasks/BOARD.md` (Shaahid coordinates), `AGENTS.md` and `README.md` (Shaahid), `docs/03-architecture/AI.md` (Shaahid owns the document, Alan owns the prompts section via a task).
4. **Each lane stays green on its own.** `make check` must pass in each lane's branch before review; neither lane may leave `main` red for the other.
5. **Blocked, not idle.** If a touchpoint is late, the waiting lane picks up its own unblocked rows (for example Alan: YT-027 market; Shaahid: YT-023 security) rather than reaching into the other lane.
6. **Money and privacy stay with their owners.** Only Shaahid touches payment code and legal/security docs; only Alan touches privacy, behavioral and trust-safety docs. Cross-lane _decisions_ (Q-001, Q-002, Q-006) need both plus the human.

## Open questions

- **Q-001 @payments @legal-compliance @architect:** How can subscription proceeds fund a separate venue Order with these accounts and permissions? The ledger is not proof of a provider funding mechanism. Need sandbox accounts and safe-test approval; never claim this is supported or compliant without evidence.
- **Q-002 @privacy @behavioral-scientist @product-designer:** Resolve real-user red/green graph versus private drift/no visible scores, own-data access versus third-party inferences, and host membership in the affected pair. Until approved, graphs are labelled synthetic only and no real-user scores appear. Phase 1 may proceed only with an explicit synthetic-only boundary if the full policy remains unresolved.
- **Q-003 @orchestrator @sre-devops:** Remote `shaahid-ahmed/yourturn`, owner `@shaahid-ahmed`, main promotion and hosted CI are verified. CODEOWNERS activation and branch protection remain separate work; commented mappings do not enforce reviews.
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

## Human Phase 1 authorization and coordinated ownership

The human explicitly authorized Phase 1 after approving the private push and main promotion. This authorizes drafting/reviewing contracts and designs while YT-006 and the residual YT-007 readiness conditions stay BLOCKED. It does not claim sandbox success, waive RULES, approve a money-flow change, authorize real-user research, freeze unresolved contracts or start Phase 2.

YT-008 through YT-013 are drafted and merged to `main` by fast-forward on the human's explicit instruction; independent agent review of these documents did not run and was **waived by the human**, not satisfied, so they remain IN REVIEW for Shaahid/Alan cross-review.YT-014 reconciliation and freeze stays in TODO and remains blocked while Q-001, Q-002 and Q-006 are open. Human ownership of every row is recorded in Claimed by and summarised under "Two-person split: Shaahid and Alan". No agent may close a task, merge to main or open the payment gate.

Scoped governance coordination under YT-007: Orchestrator handles board/status/roster; parent acts as Tech Writer for AGENTS.md, README.md and context authorization notes, QA for tests/repository.test.mjs and new contract document checks, and SRE only for root tooling needed to validate contract artifacts. No RULES.md edits. These are named limited shared-path assignments, not standing ownership. Every role must consult this authorization before treating static Phase 0 text as current status.

Contract coordination baseline (draft decisions, not approved payment policy): USD integer cents; exactly three suggested plans or explicit unavailability; no LLM payment authority; only deterministic explicit host approval can progress a future order; synthetic graph only and no real-person numeric scores; private pause reasons never collected/disclosed; consent withdrawal excludes incident edges; no Payouts/refunds/real money/automated venue reservation claims. Phase 1 makes uncertainties explicit rather than inventing policy.

Bootstrap handoffs above are historical snapshots; this authorization and the updated STATUS.md supersede their old statements about missing remote/CI/main approval. Remaining sandbox, policy and freeze blockers still apply.
