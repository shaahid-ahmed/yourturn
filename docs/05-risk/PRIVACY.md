# Privacy

**Status:** Phase 1 privacy decisions for RV-009. **Not a legal assessment, a regulatory compliance statement, or a release sign-off.** Records what is structurally decided in the Phase 1 contract and what remains open for Legal and human resolution.
**Owner:** Privacy (Alan). Tasks: RV-009, YT-024. Date: November 12, 2026.
**Inputs:** PHASE1_CONTRACT_CROSS_REVIEW.md XR-08, XR-16, XR-17, XR-22; CROSS_REVIEW_RESPONSE.md deferrals; ADR 0006; ADR 0007; PHASE1_REVIEW.md Rules 5, 6, 7; openapi.json `0.2.0-draft`; DATA_MODEL.md.

## ADR 0007 impact on the prior privacy model

ADR 0006 and ADR 0007 superseded YourTurn. The changes relevant to this document:

- **No connection graph.** YourTurn inferred pairwise closeness scores, ran drift prediction, and exposed host guidance derived from member pairs. All of that is removed. Q-002 ("Real-member graph inference gate") is **MOOT** — there is nothing to infer about and no graph to gate.
- **No "connection tracking" consent.** US-007 and US-008 described a separate opt-in for graph tracking. In Unspoken that feature is gone; it is not present in the DATA_MODEL or in openapi.json. The only consent-gated data access is calendar availability.
- **Per-member settle.** Each member authorizes their own share; no pooled funds means the custody half of Q-006 is moot on the main payment path. What remains live from Q-006: void vs refund rights, settlement failure disclosure, under-estimate refunds, and vault deletion.

---

## Consent and withdrawal (XR-16, XR-17)

### Calendar consent — prospective only (XR-16 decision)

**Decision: calendar consent is prospective.** The planner reads availability only from the point consent is granted; it does not process or retain historical calendar data. No calendar event title, attendee list, or location is stored at any time (DATA_MODEL invariant 7).

Technically: `calendar_consent.planner_may_read` defaults to 0. When a member grants consent the planner may call the Google free/busy API for upcoming periods. If a member later grants consent on a calendar they had previously declined, the system reads from the new grant timestamp and does not backfill slots from before it.

**What this requires from Architect/Backend:** The consent timestamp must be retrievable per calendar. The planner must pass it as a lower bound on any free/busy query so that pre-consent data is never requested.

### Consent history

**Decision:** A member can view their own consent choices and when each change was made. No other member, host, pod-chat message, or planner prompt receives a member's consent history.

**What remains open:** The specific UI for viewing consent history is not yet designed. The route `GET /me/calendar-accounts` exists; a per-calendar history endpoint is deferred to the next revision.

### Consent withdrawal and plan invalidation (XR-17 decision)

**Decision:** When a member revokes calendar consent (or disconnects a calendar account), any shortlist or plan whose slot set was derived using that member's availability must be revalidated before it can be used.

Concretely:

| Artifact                        | Effect on revocation                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Future free/busy reads          | Blocked immediately by the disconnect operation                                                                         |
| Existing shortlist options      | Options whose feasibility depended on the revoking member's availability are marked stale via `derived_from_member_ids` |
| Approved plans awaiting booking | Treated as stale; re-approval required                                                                                  |
| Already-booked hangouts         | Calendar write receipts stay (the member explicitly agreed to that specific booking)                                    |

**What "derived from" means here:** A time slot is derived from a member if including that member's free/busy data was necessary for the slot to appear as feasible. The backend enforces this check; the Privacy decision is that any slot that required the revoking member's availability is considered derived-from and must be re-confirmed.

**What remains open:** A formal test for `derived_from_member_ids` invalidation is filed under B-05 and XR-17 (Architect). The exact staleness cascade for multi-member scenarios (more than one member revokes) requires a backend decision.

---

## Peer visibility of member states (XR-08, XR-22)

### Paused member (XR-08 decision)

**Decision:** A paused member's **peer-visible state is their normal "joined" state.** No hardship marker, "paused" label, or participation-change indicator is visible to other members.

The contract reflects this: `participationStateVisibility: policy_pending` in the peer view means the wire format does not expose a `paused` field to peers until Q-006 resolves whether contribution collection actually stops. A pause that is visible to peers before collection effects are confirmed would constitute indirect coercion (PHASE1_REVIEW Rule 7).

This is consistent with US-005: "other members view the circle, **then** they see at most a neutral participation state with no hardship framing, no comparison and no prompt to ask me why."

**What remains open (Q-006):**

- Whether collection stops when a member pauses.
- Whether `requiredCount` for plan feasibility changes.
- Whether the host's planner sees any difference in a paused member's availability for plan feasibility.
- The exact peer-disclosed state once Q-006 is resolved — that is a joint Privacy + Legal + Behavioral decision, not a unilateral one.

### Invited member (XR-22 — decision already in contract)

**Decision:** An outstanding invitation is not disclosed to other pod members. Peers see `pendingInvitationCount` (a number) but no names, phone numbers, or other identifiers for outstanding invitations. The invited person's identity is not surfaced until they accept.

This was fixed structurally in CROSS_REVIEW_RESPONSE.md XR-22 (accepted-only peer view). Privacy records it as the correct policy.

### Member who left (XR-22 follow-on)

**Decision:** A member who leaves is removed from the peer-facing member list. Their departure is not announced to the group; no message, label, or reduced count explanation names them as having left. The peer-visible member count decreases; no entry in the list says "formerly <name>" or similar.

---

## Hardship confidentiality

**Decision (structurally enforced by contract):**

- No reason field is ever collected for a pause request. `PauseRequest.additionalProperties: false` with no reason-like property.
- No reason is stored, logged, surfaced in analytics, passed to a prompt, or transmitted to any member or system.
- Peers see a neutral participation state (see above). They cannot infer hardship from any state the system exposes.

This is a structural guarantee, not a policy preference: the wire format physically cannot carry a reason. Any change to `PauseRequest` that adds a reason-like field requires a new ADR and human approval.

---

## Own-data access and deletion

### Calendar data

A member can view their own consent state, their own calendar accounts, and their own write receipts (the hangout bookings written back to their calendar). They cannot view another member's calendar consent or availability.

Disconnecting a Google account (`disconnectCalendarAccount`) revokes consent and removes the credential reference. Free/busy slot data is not retained — only the boolean availability at planning time is used and not stored.

### Private limits vault

Each member's private limits (budget, dietary needs, dislikes, travel limits) are stored encrypted in `private_limits_vault.sealed` (AES-256-GCM). Only the owning member's planner agent reads the plaintext; no other agent, route, or prompt receives it. No column anywhere is named for a specific limit type (DATA_MODEL invariant 7).

**What remains open (Q-006):** Exact data portability, deletion, and access rights for the vault — including export format, the timeline after leaving a pod, and whether a deletion cascades to derived constraints used in suggestion sets — are pending Q-006 and Legal review.

### Post-exit own-data access (Q-006)

After leaving a pod, a former member retains access to their own payment and subscription state. The authorization matrix (`API.md`) documents this route-by-route. The exact scope is `policy_pending` until Q-006 is resolved.

---

## Pairwise third-party data

**Graph inference: MOOT under ADR 0007.** No pairwise closeness scores, edge inference, or drift computation exists. No member's interaction data is ever used to draw conclusions about their relationship with other members.

**Calendar availability:** The planner's free/busy check produces a list of feasible time slots. The slots tell the planner when members are collectively free; they do not reveal whose calendar was consulted for each slot. The `askPrivately` list (members the planner should ask privately because they have no calendar consent) is delivered only to the planner, never shown in pod chat.

**Stretch asks:** A stretch ask is routed only to that member's private planner chat. No other member sees the question or the answer. The question is derived from that member's constraints only, and the answer never enters pod chat.

---

## Retention and deletion

**What is decided:**

- Calendar: no historical slot data is stored (read at planning time only, not retained).
- Hardship reasons: never collected, so no retention question arises.
- Stretch-ask responses: stored in the requesting member's planner chat, never in pod chat. Deletion is part of that member's own planner chat history.

**What remains open (Q-006):**

- Retention period for `private_limits_vault` entries after a member leaves a pod.
- Retention period for payment records (settlement payments, splits) after a member leaves.
- Deletion cascade when a pod is dissolved.
- Right to export one's own data (not currently implemented).

---

## Data inventory and lawful basis review

A complete data inventory and lawful basis assessment require Legal and Privacy counsel. This document records design-level decisions only; it is not a GDPR, CCPA, or other regulatory compliance assessment. The relevant gap is tracked in `docs/05-risk/COMPLIANCE.md` under L-1 to L-5.

No personal data is collected from real users in Phase 1. The MVP audience is fictional circles of 3–8 people in an isolated synthetic demo.

---

## Host-only disclosure and synthetic demo

**Decision (already in contract):**

- Host guidance is positive plan framing only, never a warning, score, or diagnosis about members.
- In the synthetic demo the graph illustration uses labelled fictional people. No real-person data can enter the demo path; the boundary is server-enforced.
- Q-002 is MOOT: there is no real-member graph inference to gate or disclose.

**What remains open (Q-013):** Votes in the activity and time polls show member names (the spec requires it). Whether this is acceptable has Privacy and Behavioral dimensions; Q-013 records this as a standing open question.

---

## Private budget answers: the tally boundary (UN-009)

**What this covers:** the answers that would reveal a member's money if they leaked. They are whether an option "works" for one member's private limits, the private stretch ask and its answer, and the limits themselves. Audited against the code on `main` (November 12, 2026).

**The guarantee is architectural and policy-based, not cryptographic.** The code that checks feasibility sees a member's budget and the per-member answer in plaintext, in process memory. Anyone who can read that process (an operator, a debugger, a memory dump) can see them. No secure enclave, secret sharing or multi-party computation is used, and the product must never say otherwise.

### Where each private answer lives

| Data                                             | Held in                                                                                                | Persisted?                                                                                                           | Logged? | Who can read it                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| Private limits (budget, diet, dislikes, travel)  | `ConstraintVault`, sealed per member with AES-256-GCM                                                  | Today **no**: memory only, lost on restart (#101). PR #106 persists only the sealed record in `private_limits_vault` | No      | That member (`/me/private-limits`) and that member's planner run                                      |
| "Works / doesn't work" for one member and option | The caller's memory while the shortlist is built (`checkBudget` returns only `{ memberId, feasible }`) | **Never.** No table has a column for it (asserted by `tests/privacy-boundary.test.mjs`)                              | No      | Nobody outside the planner run                                                                        |
| Stretch approval during a planning run           | `StretchSession`, in memory                                                                            | Never                                                                                                                | No      | The planner run                                                                                       |
| The stretch ask and its answer                   | `stretch_ask` (option title, per-person cost, deadline, status)                                        | **Yes, deliberately.** The deadline and the one-hangout scope must survive a restart. The table has no pod column    | No      | Only that member (`/me/stretch-asks/...`); no pod-scoped response references it                       |
| Prompt context sent to the model                 | `buildPromptContext` (first name and plan-relevant tags)                                               | Not stored                                                                                                           | No      | The model provider, which never receives budgets: `findForbiddenFields` is asserted before every call |

**Deviation from the original UN-009 wording.** UN-009 said per-member answers are "never persisted". That holds for feasibility answers. It does **not** hold for the stretch ask, which is stored because it is the member's own private message with a deadline. The stretch ask is kept private by scope (owner-only routes, no pod column), not by being kept out of storage.

**Not wired yet.** `checkBudget` has no caller in the running server, and the ADR 0006 `tally.mjs` is used only by its legacy tests. When the planner hook lands (#100), it must call the checker in memory, pass only the feasible set onward, and write nothing per member.

### Logging

- Fastify's request logger is off (`logger: false`), so request bodies and headers are never logged.
- Validation failures log the validator's error descriptors: the field path and the rule that failed, not the submitted value.
- **Risk (PV-08):** the 500 handler logs the whole error object. If code that handles private limits ever puts a value into an error message, it would be logged. **Rule:** code that touches limits, stretch asks or feasibility must never interpolate a private value into an error, log line or exception.

### What the pod can still infer (inference over rounds)

The pod sees only the shortlist (options that work for everyone), the votes, and whether "nothing fit this time". Even so:

1. **Missing options narrow a ceiling.** If an option a member suggested (P17) never appears, everyone knows someone's limit excluded it. Over several rounds with visible prices ("nothing above $40 has ever appeared"), the group can bound the lowest budget. In a 3-person pod, members who know their own budgets can sometimes work out whose it is.
2. **"Nothing fit" after a widening** says the same thing more sharply.
3. **Timing of a stretch ask.** A pause in planning followed by a pricier option suggests someone accepted a stretch.
4. **The hangout state leaks a stretch ask today (PV-09).** `getHangout` returns the raw state, so every pod member can see `STRETCH_ASKS`, which reveals that someone was asked to stretch. The Home cue (`podStage`) already shows it as "planning", but the hangout read does not.

**Mitigations in place:** no reasons, labels or counts on cards (contract invariant 5); a diversity rule that keeps at least one free or near-free option, so a "nothing fit" outcome is rarely about money; stretch answers that apply to one hangout only. **Not mitigated:** points 1–3 are inherent to showing a filtered shortlist and can only be reduced, not removed. Members should be told this in the P20 privacy explanation.

## Open items

| ID    | Item                                                                                                                                                                                 | Blocked by                  | Owner                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | ---------------------------- |
| PV-01 | Collection effect of a pause — does charging actually stop?                                                                                                                          | Q-006, Payments             | Legal + Payments + human     |
| PV-02 | Exact peer-disclosed state for a paused member once PV-01 resolves                                                                                                                   | Q-006 → PV-01               | Privacy + Legal + Behavioral |
| PV-03 | Vault deletion and export rights after leaving a pod                                                                                                                                 | Q-006, Legal                | Legal + Privacy              |
| PV-04 | Post-exit own-payment access scope                                                                                                                                                   | Q-006                       | Legal + Privacy              |
| PV-05 | Lawful basis and regulatory assessment (GDPR/CCPA)                                                                                                                                   | Phase 2, Legal              | Legal counsel                |
| PV-06 | Poll vote names visible to peers (Q-013)                                                                                                                                             | Q-013                       | Privacy + Behavioral         |
| PV-07 | Multi-member `derived_from_member_ids` staleness cascade (more than one leaves)                                                                                                      | Architect, B-05 test        | Architect + Privacy          |
| PV-08 | The 500 handler logs whole error objects; a private value in an error message would be logged (UN-009)                                                                               | Backend code rule           | Backend + Privacy            |
| PV-09 | `getHangout` returns `STRETCH_ASKS` to every pod member, revealing that someone was asked to stretch (UN-009). Fix: map it to `PLANNING` in pod-scoped responses, as `podStage` does | Contract change (Architect) | Architect + Backend          |
| PV-10 | Tell members in P20 that the shortlist can be inferred over rounds (UN-009 points 1–3)                                                                                               | Content copy                | Content + Privacy            |
