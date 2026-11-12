# Metrics

**Status:** Structured Phase 0 stub — **plan only. Nothing in this file is instrumented or measured.** No analytics pipeline, event pipeline or tracking implementation exists; none is in Phase 2 scope. These are targets and design intents, not observed data. (LA-06)

**Owner:** Data & Analytics; Product Manager supplies metric intent. Task: YT-008, YT-018.

Read PRODUCT.md, CONSTRAINTS.md, RULES.md and the behavioral checklist before completing this document. Phase 1 requires explicit human release.

**Stable metric IDs (LA-05):** every metric has an `M-xx` id so stories, tasks, and pitch claims can cite a specific metric and check for drift.

## North star: meaningful in-person connection (hypothesis)

**M-01** Number of hangouts attended per member per 90 days (voluntary; not equated with friendship quality).

TODO (Data & Analytics; Product Manager supplies metric intent): specify evidence thresholds, minimum circle size, and review criteria in the linked task.

## Guardrails: autonomy, privacy and coercion

**M-02** Fraction of members who complete a leave action without a retention barrier (target: 100%).

**M-03** Rate of pause requests that succeed without a reason field interaction (target: 100%).

**M-04** Fraction of suggestion sets that include the "unavailable" honest path in QA (target: 100% reachable).

**M-05** Duplicate-webhook idempotency rate — identical provider events that produce no second ledger entry (target: 100%).

TODO (Data & Analytics; Product Manager supplies metric intent): specify measurement approach, review criteria and behavioral-scientist approval gate in the linked task. Each guardrail metric must be reviewed against ETHICS_CHECKLIST.md E-01 through E-08 before launch.

## Event schema

**M-06** `hangout_joined` — member accepted invitation; no connection-strength payload.

**M-07** `agreement_completed` — whole-group agreement recorded; amount in integer cents; no per-member attribution.

**M-08** `plan_approved` — host approved a plan version; plan id and total; no score or ranking payload.

**M-09** `balance_state_changed` — IOU balance transitioned (owed → pending → paid / failed); member id and hangout id; never includes reason for failure.

**M-10** `tracking_consent_changed` — member toggled tracking on or off; timestamp only; no prior state in the event payload.

TODO (Data & Analytics): confirm schema fields, enforce `additionalProperties: false` on each event, and add sampling/retention decisions before any instrumentation ships.

## Measurement consent and limitations

**M-11** Consent gate — no event above is recorded until the member has made an affirmative tracking choice (M-10 on = opted in). Withdrawal (M-10 off) invalidates cached artifacts before the next read.

**M-12** Small-circle inference floor — counts derived from circles of exactly 3 members must not expose individual attribution; apply the same no-naming rule as PHASE1_REVIEW B-03.

**Limitations:** these are design requirements, not evidence of behavior. No A/B framework, no prediction model, no cohort analysis and no claim of causal outcome is authorized by this stub. Any metric added to a pitch must be reviewed by Behavioral Scientist and map to a cited source in RESEARCH_NOTES.md.

TODO (Data & Analytics; Product Manager supplies metric intent): specify evidence and review criteria in the linked task.
