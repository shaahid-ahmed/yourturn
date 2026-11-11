# Behavioral principles

**Status:** Complete Phase 0 policy baseline; not a feature specification or release approval.

**Owner:** Behavioral Scientist · **Task:** YT-005 · **Date:** November 11, 2026

## Purpose and authority

YourTurn aims to help existing friend circles make voluntary time together. It must not turn friendship into a debt, competition, diagnosis, or obligation to disclose private circumstances. These are normative design commitments, not demonstrated product effects.

The Behavioral Scientist is a gatekeeper: every change touching **notifications, money, drift, or social comparison** requires explicit behavioral sign-off before merge. The [ethics checklist](ETHICS_CHECKLIST.md) defines evidence, reviewers, and stop conditions. Independent Reviewer approval, green CI, and applicable human approvals remain separate requirements. No approval has been granted by this document.

## Evidence versus design choices

Self-Determination Theory (SDT) identifies **autonomy, competence, and relatedness** as its three psychological needs.[1] Fairness and belonging without exclusion are additional YourTurn design commitments; do not attribute them as fourth and fifth canonical SDT needs. Our application of the theory to this product is a design interpretation, not an experimentally validated intervention. See [research notes](RESEARCH_NOTES.md) for findings, limits, hypotheses, and pitch permissions.

## Principles and observable acceptance checks

All requirements below are **normative safeguards**. Their benefits remain hypotheses until evaluated.

| Principle                   | Product obligation                                                                                                                                                                               | Evidence required before relevant implementation can merge                                                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relatedness                 | Prioritize freely chosen connection outside the app, not time-in-app, streaks, or notification engagement. Do not equate logged attendance with friendship quality.                              | Review metrics and copy for engagement pressure; verify missing/offline activity is not presented as personal failure or proof of drift.                                                                                               |
| Autonomy                    | AI suggests; people choose. Declining plans, skipping a hangout, and disabling tracking require no explanation and cause no attendance penalty or shaming. A skipped event is not a circle exit. | Exercise decline, skip, mute, tracking-off, and leave paths separately; inspect resulting messages, inferred edges, and money actions. No AI-triggered payment without explicit host approval and deterministic execution.             |
| Competence                  | Make hosting understandable and manageable without claiming that AI knows what friendships need. Provide understandable choices and a non-AI path.                                               | A first-time host can understand suggestions, reject all of them, and identify the next step without revealing another member's private information. A failed suggestion does not block a safe exit.                                   |
| Fairness                    | Share organizing opportunities through rotation, while allowing accommodation for availability, disability, and hardship. Equal turns are not proof of equal effort or affordability.            | Review a full synthetic rotation and a pause/absence case for blame, exclusion, forced extra cost, and hidden penalties. Unsettled accommodation or rotation policy goes to PM and the relevant owners; do not invent a contract here. |
| Belonging without exclusion | No attendance, closeness, or reliability ranking; no public identification of a weak link, unreliable friend, or person needing repair.                                                          | Inspect all surfaces, assistive text, messages, exports, and copilot outputs for direct and indirect rankings. Do not turn edge thickness, ordering, or color into a real-person comparison.                                           |

## Private drift and the Q-002 stop condition

The product brief's red-to-green graph demonstration conflicts with private drift and no visible scores. **Q-002 remains unresolved.** Until Privacy, Behavioral Scientist, and a human explicitly approve the resolution, the red/green graph is a **synthetic fixture demo only**: fictional people and histories, conspicuous simulation labeling, and no path that substitutes real accounts or data. A synthetic edge change illustrates scripted behavior, not measured improvement or validated prediction. Use a non-color textual/symbol cue in that fixture demonstration as well.

No real numeric connection-strength scores are visible to anyone, including the host, members, or group; no numeric score in notifications, accessible labels, tooltips, downloadable user reports, or copilot text. A hidden number rendered as a ranking, color, warning, or relative closeness ordering is not a workaround. Do not authorize real-user drift inference or presentation through this baseline.

If a future Q-002 resolution permits host assistance, the upcoming host may receive only positively framed, actionable suggestions such as “Plan something Sam and Priya would both love.” Do not show the host a raw drift label, risk estimate, pair ranking, or explanation identifying a supposedly failing friendship. No drift warnings to the group or the pair. Host status alone is not consent, and access must not persist after that role ends. Product Designer participates in the resolution; Privacy and Behavioral approval plus human approval are mandatory.

## Consent, access, and hardship boundaries

- Graph participation is a separate affirmative choice, not a preselected condition hidden in payment or circle enrollment. One member cannot consent for another.
- Turning tracking off excludes that member and **every incident inferred edge**, including edges derived from another member's attendance or check-in. Also exclude these from prompts, suggestions, caches, and scheduled notifications. Re-enabling cannot silently resume historical tracking.
- Seeing one's own data means access to the person's submitted data and a clear explanation of permitted processing; it does not automatically authorize third-party relationship inferences, pair scores, or another person's hardship details. Privacy must resolve access/deletion and retention requirements before implementation; neither conceal lawful access rights nor expose third-party data by guessing. Unresolved access semantics block release.
- A hardship pause needs no public reason or documentary proof in a group flow. Do not put hardship reasons in copilot prompts, group messages, user-facing payment labels, or analytics. Even a neutral status can reveal a pause in a small circle: review necessary disclosures explicitly rather than promising anonymity.
- Contributions require whole-group agreement and remain capped at $15. A cap does not establish affordability. No automatic increase or prompt to pressure a friend to pay.
- Preserve the brief's disclosed-forfeit requirement as a requirement under review, **not a finding that forfeiture is lawful, enforceable, or approved**. Legal & Compliance, Payments, Privacy, Behavioral Scientist, and the human must resolve exit, pause, collection cancellation, and disclosures as applicable. This document provides no legal advice or money-flow approval.

## Measuring the right things without claiming success

Candidate evaluation questions: can members decline comfortably, understand tracking, leave easily, and host without feeling ranked or watched? These are research questions, not verified outcomes. Keep participation voluntary, minimize collected data, and do not expose individual responses to the circle. Do not infer a real friendship outcome from a fixture score change, retention, payment completion, or attendance alone.

Any evidence of coercion, unauthorized disclosure, shame, or exclusion is a stop-and-review signal; a conversion increase cannot override a failed safeguard. The [research notes](RESEARCH_NOTES.md) specify what a future study must establish before stronger claims are allowed.

## Sources

[1] https://www.selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf — Ryan & Deci (2000), Self-Determination Theory and the Facilitation of Intrinsic Motivation, Social Development, and Well-Being
