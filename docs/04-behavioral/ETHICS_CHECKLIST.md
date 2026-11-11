# Ethics checklist and behavioral gate

**Status:** Complete Phase 0 gate definition; checks below are acceptance criteria, not completed product tests.

**Owner:** Behavioral Scientist · **Task:** YT-005 · **Date:** November 11, 2026

## Eight hard rules — verbatim from the setup brief

1. **Drift is private.** "Sam and Priya are drifting" is shown only to the upcoming host, framed positively ("plan something Sam and Priya would both love"). It is never shown to the group, never shown to Sam or Priya as a warning, and never used as a score anyone can see.
2. **No public leaderboards** of attendance, closeness or reliability.
3. **No guilt or shame copy.** Banned patterns include "You've let your friends down," countdown-panic messages and loss-framed nags. Content Designer and Behavioral Scientist must both approve notification copy.
4. **No dark patterns:** no hidden cancellation, no pre-checked upsells, no streak anxiety, no fake scarcity.
5. **Opting out is easy:** leaving a circle takes 2 taps and no penalty beyond the forfeit already explained at signup.
6. **Consent to the graph:** each member opts in to connection-strength tracking during onboarding, can see their own data and can turn tracking off.
7. **Money never becomes coercion:** contribution amounts are agreed by the whole group, capped at $15, and a member in hardship can pause without anyone else being told why.
8. **Every behavioral claim in the pitch needs a source** in `RESEARCH_NOTES.md`, or it gets cut.

## Interpretation without weakening the rules

These rules are normative product constraints, not empirical findings. Read them with [PRINCIPLES.md](PRINCIPLES.md); references and permitted claims live in [RESEARCH_NOTES.md](RESEARCH_NOTES.md).

- **Q-002 stays blocked:** the red/green graph may demonstrate synthetic fixtures only until Privacy + Behavioral Scientist + human resolve its conflict with private drift. Involve Product Designer. Do not silently reinterpret the rules to permit a real-person graph.
- **Positive suggestions only:** any subsequently approved upcoming-host assistance uses positive planning language, never a raw “are drifting” label, warning, reason code, rank, or numeric score. Host access is purpose-limited, not blanket permission for pair data.
- **No real numeric scores visible:** inspect nonvisual and indirect surfaces too. A color, ordering, or label that reveals real-person drift/comparison also fails while Q-002 is unresolved.
- **Own-data access is not third-party-inference access:** Privacy must settle what is accessible, explainable, erasable, and retained. Do not solve the conflict by showing forbidden scores or arbitrarily refusing legally required access; keep the affected behavior blocked pending resolution.
- **Forfeit is unresolved:** retaining the rule verbatim is not legal approval. A member must be able to stop participation/collection through an approved exit process without a support conversation or new penalty. Do not invent refund eligibility, legal enforceability, or a PayPal cancellation mechanism here. Money-flow changes need human approval.

## Testable acceptance checklist

Every applicable row needs a recorded PASS with evidence. Default is **NOT RUN**, not assumed success. FAIL or BLOCKED prevents approval. A reasoned N/A requires explicit Behavioral Scientist acceptance; the feature author cannot self-exempt.

| ID / rule | Test and pass condition                                                                                                                                                                                                                                                                                                                                                                    | Required evidence / collaborators                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E-01 / 1  | Try group member, involved member, upcoming host, former host, and outsider access. With Q-002 open, none can obtain real-person drift or scores; the demo consumes only fictional fixtures. Any later approved host output contains positive suggestions only. Check responses, views, URLs, notifications, tooltips, accessibility text, exports, logs exposed to users, and LLM output. | QA role/access tests, Privacy review, Behavioral review, fixture-isolation evidence; Q-002 decision and human approval before expanding scope.                                                                   |
| E-02 / 2  | Inspect attendance, closeness, and reliability screens and copilot suggestions. No leaderboard, ordered best/worst list, badge, “weakest link,” or visual proxy that ranks members or pairs.                                                                                                                                                                                               | Content and design inventory, screenshot/assistive-text review, QA assertions, adversarial copilot examples asking for rankings.                                                                                 |
| E-03 / 3  | Review every notification template, generated variant, subject line, preview, retry, and timing rule. No blame, countdown panic, loss-framed nag, or missed-event shame; muting/declining does not trigger a pressure sequence.                                                                                                                                                            | Content Designer **and** Behavioral Scientist approvals attached to the exact copy/timing revision; notification tests including disabled delivery and stale queued messages.                                    |
| E-04 / 4  | Walk enrollment, payment, cancellation, pause, notification settings, and graph consent. No hidden exit, preselected upsell/consent, fabricated scarcity, or streak-loss pressure.                                                                                                                                                                                                         | QA walkthrough with interaction recording and default-state captures; Accessibility review of discoverability and keyboard/screen-reader equivalents.                                                            |
| E-05 / 5  | From the ordinary circle/settings exit surface, a member can leave in at most 2 taps: leave, then confirmation. No retention detour, reason requirement, or contact-support step; navigation must not conceal the entry point. Disclosed approved consequences are consistent at signup and exit, and no extra penalty is created.                                                         | Recorded interaction count and cancel-before-confirm test; downstream collection/access tests against an approved policy. Legal/Payments/human resolution required for unresolved forfeit/cancellation behavior. |
| E-06 / 6  | Start with tracking off; require affirmative opt-in from each participant. Turn one member off after consenting: exclude them and every incident inferred edge from recomputation, prompts, suggestions, caches, exports, and queued notifications, including edges reconstructed from others' records. No backfill or automatic re-enrollment.                                            | Consent-state tests and a mixed-consent circle fixture; Privacy-approved own-data access/retention rules; tests that individual access does not disclose third-party inferences.                                 |
| E-07 / 7  | Reject contributions above $15 and any amount change lacking whole-group agreement. Test hardship pause and skipped attendance separately: no shaming, forced explanation, public reason, hidden penalty, or AI payment action. Check whether even a neutral visible status reveals the pause.                                                                                             | Payments deterministic-boundary tests, Privacy disclosure review, Behavioral copy review; consent/disclosure evidence. LLM cannot move money; host approval remains required.                                    |
| E-08 / 8  | Inventory every behavioral statement in pitch, demo narration, captions, and product copy. Map each empirical statement to an approved research-note claim with source and limitations. Delete unsupported outcome, numerical-effect, causal, and validated-prediction claims.                                                                                                             | Claim-by-claim review by Behavioral Scientist and Demo & Pitch; rendered draft, not just speaker notes. “Designed to” describes intent, never proof of benefit.                                                  |

## Gate process

1. **Identify scope before implementation.** The author marks whether the change touches notifications, money, drift, or social comparison, plus any user-facing/consent effect. Any of the four triggers requires behavioral sign-off before merge. User-facing changes also undergo applicable checklist review even if none of the four is obvious.
2. **Assemble a review packet.** Include task/PR, exact revision, affected surfaces and audiences, data inputs/recipients, defaults, copy, timing, consent and exit paths, fixture/test results, research claims, open decisions, and a rollback or disable path. Do not include real hardship details or unnecessary personal data in evidence.
3. **Evaluate and record.** For E-01 through E-08 record PASS / FAIL / BLOCKED / NOT RUN / accepted N/A, evidence location, reviewer, and rationale. Missing evidence is NOT RUN. Q-002, unsettled forfeit legality, or unsettled access semantics are BLOCKED where applicable, not waived by demo urgency.
4. **Collect explicit approvals.** Behavioral Scientist approves all triggered changes. Content Designer co-approves notifications. Privacy approves sensitive inference/consent/access changes; Legal & Compliance and Payments review money/exit issues. Trust & Safety reviews coercion/exclusion cases; Accessibility reviews affected interaction/visualization barriers. These do not substitute for the independent Reviewer or human money-flow, rules, main-merge, and final-demo gates.
5. **Apply the stop rule.** Any failed hard rule, unresolved applicable decision, or absent required signature blocks merge of that behavior. A synthetic-only demonstration may be reviewed as such; it cannot serve as permission for real-user processing. Route questions through the owning role and Orchestrator to the board; this document does not resolve Q-002.
6. **Revalidate changes.** Approval binds to the reviewed revision and audience. A copy, prompt, threshold, data-input, recipient, default, or timing change affecting the gate invalidates the affected approval and requires renewed evidence/sign-off. After a safety regression, disable the affected behavior and escalate; do not continue merely because engagement improved.

### Review record template (copy into the relevant PR/handoff)

```text
Task / PR / revision:
Scope: notifications [ ] money [ ] drift [ ] social comparison [ ] other user effect [ ]
Audience and data classification: synthetic only / proposed real-user
E-01..E-08: status, evidence location, reviewer, rationale
Unresolved questions / applicable decision records:
Behavioral Scientist: named reviewer, explicit decision, timestamp, revision
Content / Privacy / Legal / Payments / T&S / Accessibility: required approvals
Independent Reviewer / CI evidence:
Human approvals required and their recorded decisions:
Decision: APPROVE / BLOCK / REQUEST CHANGES
Disable or rollback path / re-review triggers:
```

## Phase 0 completion boundary

This file defines tests and approvals; it does not assert that product tests, sign-offs, CI, research with participants, payment validation, or Q-002 resolution have occurred. Documentation completion can be reviewed independently. Later feature readiness requires actual evidence under this process, not a checked box copied from the scaffold.
