# US-107 Behavioral and trust review

**Status:** Complete — sign-off with open blocks noted.
**Owner:** Behavioral Scientist (Alan Jacob Anil) · **Task:** US-107 · **Date:** November 12, 2026
**Revision reviewed:** `frontend/mobile-screens` branch; screens P1–P23 as merged. Baseline: [PRINCIPLES.md](PRINCIPLES.md), [ETHICS_CHECKLIST.md](ETHICS_CHECKLIST.md), [RESEARCH_NOTES.md](RESEARCH_NOTES.md).

---

## Scope

Reviewed: all 23 implemented frontend screens (P1–P23 on `frontend/mobile-screens`), including entry/onboarding (P1–P4), home/pods (P5–P6), pod chat and planner cards (P7–P12), money screens (P13–P15, P23), and hub screens (P16–P22). Reviewed: notification type labels in settings, stretch-ask copy in the private planner chat, and booking-confirmation copy.

Not reviewed: running backend code, actual push notification message strings (not yet written), money server logic, connection-strength computation (Q-002 closed by ADR 0007 — drift removed), real-user data flows. **No review here grants approval for items in the BLOCKED column below.**

---

## Rule-by-rule review

| Rule | Decision | Evidence from the implemented screens | Residual / remaining blocks |
|------|----------|----------------------------------------|-----------------------------|
| 1. Drift is private | **N/A — PASS** | ADR 0007 retired drift and tie-strength entirely. YT-019 archived. No drift field, label, warning, or score exists anywhere in the implemented screens or data model. The home screen stage labels (`Planning`, `Poll open`, `Booking pending`, `Payments open`) describe hangout state, never member state. | None; the rule's occasion is removed. If drift inference is ever re-introduced, this review is invalidated and a new gate is required. |
| 2. No public leaderboards | **PASS** | No attendance, closeness, or reliability ranking on any screen. Activity shortlist cards (P9) show votes by name, not a "best" badge or ordering claim. Time-poll (P10) shows raw vote counts only. Ready-check aggregate (P11) says "2 of 3 ready" with no per-member reveal of who declined. Stage labels are neutral hangout-state descriptions. DESIGN_SYSTEM.md never-build list preserved in component constraints. | A future "activity history" or "reliability" surface would reopen this; any such feature requires a new behavioral review before implementation. |
| 3. No guilt or shame copy | **PASS for reviewed copy; BLOCKED for unwritten push notification text** | Reviewed copy (P5 stage cue, P20 notification labels, P22 stretch-ask, P7–P12 planner cards): neutral throughout. Specific findings: (a) P20 notification type labels — "Polls and votes", "Balance reminders", "Booking confirmations" — neutral, function-descriptive, approved; (b) P20 clarification note "Notifications are never used for streaks or pressure" — approved; (c) P22 stretch-ask ("a little over your usual budget. Would a one-time exception work?") — approved; (d) P22 planner yes-response ("The group won't know you stretched") — approved; (e) P22 no-response ("I'll keep looking for options within your usual budget") — approved; (f) P5 empty-state body ("Your first pod is waiting…Create one to start planning together") — approved; no urgency framing. | Push notification message strings have not been written. When they are written, every string — subject, body, preview, retry, timing — requires both Content Designer and Behavioral Scientist approval before any send. No send without that approval. |
| 4. No dark patterns | **PASS** | Connection-tracking toggle is off by default (P20). Subscription requires explicit user action (P3). Leave/delete requires a confirmation (P20 "Delete account" uses `confirm()`). No pre-checked upsell, no countdown, no streak indicator, no auto-dismissing error message, no fake scarcity on any screen. Cancel is not suppressed or visually deprioritized in confirmation dialogs. P3 subscription screen clearly labels demo status ("Demo — no real charge"). | Visual implementation can still create asymmetry; this review is of content and logic only. YT-029 (accessibility/visual audit) must verify contrast and weight parity for destructive-flow buttons and consent toggles before those screens are accepted as compliant with rule 4. |
| 5. Opting out is easy | **PASS with Q-006 block on forfeit consequences** | P8 pod settings and P20 settings both offer a leave/delete path. The P20 "Delete account" uses a single confirmation dialog — 2 activations total (button tap + confirm). No retention detour, no reason field, no contact-support requirement appears in the screens. P8 pod settings has no hidden exit; the entry point is on the main settings card. The booking confirmation card (P12) states explicitly "This is not a payment and not a reservation" and requires a separate confirm action. | Forfeit/subscription consequences on leaving remain `policy_pending` (Q-006). The implemented screens correctly label this as deferred ("Access, deletion, and retention semantics are policy-pending (Q-006)" — P20). Legal and human must resolve before the leave path is finalized. This is correctly blocked in the UI; no workaround may be implemented without that resolution. |
| 6. Consent to the graph | **PASS for the tracking toggle; BLOCKED on own-data access** | P20 tracking toggle is off by default with an explanatory note: "Tracking is your choice. If you turn it on, you can see your own data and turn it off at any time. Turning it off removes your edges from all computations, prompts, and cached results." The note correctly describes the withdrawal effect without over-promising cryptographic guarantees. P4 profile-creation flow shows the tracking consent as an independent step distinct from payment consent. | Own-data access is marked `policy_pending` (Q-006) on P19 and P20. The "View my data" button is present but its destination and access semantics are unresolved. Privacy must settle access, explainability, and retention before this surface can ship. This is correctly blocked; do not silently resolve it by showing or hiding data without that decision. |
| 7. Money never becomes coercion | **PASS for all implemented money surfaces; payment gate closed** | All money screens carry a `SandboxBanner`. P12 booking confirmation states "This is not a payment and not a reservation. I won't book anything until you confirm." P13 (payer and split) uses a note "This is not a payment to the venue" and shows an equal split with a rotating-remainder explanation. P14 settle-up shows balance chips with 5 distinct labelled states; "Send reminder" is private (never goes to pod chat); no public shaming of a person in `owed` state. The P22 stretch-ask is private to the member; the group is never told that a member's budget was asked about or what they answered. No contribution amount above $15 is reachable in any screen's input validation. | Member-to-member PayPal settlement (US-006) is blocked on Q-010. The payment gate is correctly closed. No money may move until Q-010 is resolved and the gate is explicitly opened by human approval. This review does not open the gate. |
| 8. Every behavioral claim needs a source | **PASS** | UI copy contains no empirical behavioral claims — no "research shows," no effect sizes, no predictions about friendship quality. All in-app text is functional description of what the user is doing or what the app will do. The sandbox demo is consistently and prominently labeled. RESEARCH_NOTES.md claim register unchanged by this review; hypotheses remain hypotheses. | Pitch and demo script (US-304) are not yet written. When written, every empirical statement must map to an approved entry in RESEARCH_NOTES.md or be cut. The claim gate in RESEARCH_NOTES.md describes this process and must be followed. |

---

## Notification copy approved in this review

The following **type label** strings (displayed in P20 Settings) are approved:

| String | Context | Decision |
|--------|---------|----------|
| "Polls and votes" | Notification toggle label | **Approved** — neutral, function-descriptive |
| "Balance reminders" | Notification toggle label | **Approved** — neutral; no urgency or blame framing |
| "Booking confirmations" | Notification toggle label | **Approved** — neutral, function-descriptive |
| "Notifications are never used for streaks or pressure." | P20 clarification note below toggle group | **Approved** — accurately states the rule |

The following **in-app planner strings** (P22 private planner chat) are approved:

| String | Context | Decision |
|--------|---------|----------|
| "The best option for Friday crew is a little over your usual budget. Would a one-time exception work for this hangout?" | Stretch-ask card body | **Approved** — framed as a one-time question, not pressure; private to the member |
| "Your usual budget: $X · This option: $Y" | Stretch-ask card metadata | **Approved** — factual, not shaming |
| "Yes, just this once" / "No thanks" | Stretch-ask response buttons | **Approved** — equal-weight options; "No thanks" requires no explanation |
| "Thanks! I'll include that option in the shortlist. The group won't know you stretched." | Planner yes-response | **Approved** — confirms privacy of the member's decision |
| "Understood. I'll keep looking for options within your usual budget." | Planner no-response | **Approved** — neutral, no negative consequence framing |

**Not approved in this review:** any push notification message text. Push notification strings have not been written. Every push message — subject line, body, preview text, retry copy, and its timing rule — requires both Content Designer and Behavioral Scientist sign-off before it may be sent to any device. No send without that sign-off, including for the demo.

---

## Items that cannot be approved in this review

| Item | Reason | Who decides |
|------|--------|-------------|
| Any push notification message text | Not yet written; rule 3 requires dual Content + Behavioral approval of the exact text and timing | Content Designer + Behavioral Scientist |
| Forfeit / leave consequences | Q-006 open; a leave that does not stop collection is coercive | Legal + Payments + human |
| Own-data access design | Q-006 open; access must not expose a counterpart's data | Privacy |
| Member-to-member payment path | Q-010 open; payment gate closed | Human (gate approval) |
| Any drift inference or display | ADR 0007 removed drift; this review does not re-authorize it | Privacy + Behavioral + human (if ever reconsidered) |
| Pitch and demo script behavioral claims | Not yet written; must map to RESEARCH_NOTES.md | Demo & Pitch + Behavioral Scientist |

---

## Checks delegated to other roles (pending re-review before ship)

For **Frontend / Accessibility (YT-029)**:

- **BA-01** Tracking toggle is off by default on a fresh install; verify rendered initial state.
- **BA-02** "Delete account" and pod-leave confirmation: Cancel and Confirm have equal visual weight; focus opens on the non-destructive action.
- **BA-03** Balance chips in P14 convey status by text label, not color alone; verify with color removed.
- **BA-04** No hover-only affordance on any touch target; 44 px minimum met.
- **BA-05** Two-activation leave works equivalently for keyboard and screen-reader users.

For **Backend / API**:

- **BA-06** No push notification is sent before Content + Behavioral joint approval is recorded for that string.
- **BA-07** Stretch-ask response (`yes` / `no`) is never stored in a group-visible location or included in any group message or notification.
- **BA-08** Hardship pause request has no reason field in the wire format; `additionalProperties: false` enforced.

For **QA (US-303)**:

- **BA-09** A member who answers "No thanks" to a stretch ask sees no negative status change, no message to the pod, and no retry ask within the same hangout.
- **BA-10** Muting or declining a notification type in P20 does not trigger a "you haven't been notified" pressure sequence.

A single failure of BA-01 through BA-10 blocks the affected behavior before ship.

---

## Behavioral Scientist decision

**APPROVE** the implemented screen content (P1–P23 on `frontend/mobile-screens` at this revision) with the specific notification copy listed above, subject to the following conditions:

1. No push notification message ships without Content Designer + Behavioral Scientist joint approval of the exact text, timing, and retry behavior.
2. The payment gate (US-006, Q-010) remains closed until human approval is recorded.
3. Q-006 (forfeit, own-data access) is resolved before the leave path and "View my data" button are finalized.
4. BA-01 through BA-10 are verified with evidence before this approval transfers to a release build.
5. Any change to notification type labels, planner chat copy, booking confirmation copy, or stretch-ask copy after this revision requires a new behavioral review.

This approval binds to the reviewed revision. It does not constitute a release sign-off (that is YT-030 / US-107 is a gate input, not a release gate itself). It does not open the payment gate, resolve any open question, or grant legal or compliance approval.

**Reviewer:** Alan Jacob Anil (behavioral-scientist) · **Date:** November 12, 2026 · **Task:** US-107
