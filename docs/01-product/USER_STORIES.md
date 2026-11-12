# YourTurn user stories and UX research

**Status:** Phase 1 draft for YT-008 (stories) and YT-012 (research section); not implemented behavior, approved contracts or release approval. Authorization and boundaries: `tasks/BOARD.md` → "Human Phase 1 authorization and coordinated ownership".
**Owners:** Product Manager owns the story sections; UX Researcher owns "UX research" only. Scope and non-goals live in [PRD.md](PRD.md).

## How to read these stories

Each story has a stable ID, a user-visible intent and Given/When/Then acceptance criteria written so QA (YT-028) and Architect (YT-009, YT-014) can test them. Criteria describe **required behavior of a future authorized implementation**; nothing below is built, and no criterion asserts a payment, reservation, legal right or measured friendship outcome. Where a decision is unresolved, the criterion states the blocked boundary instead of inventing policy.

Money appears only as USD integer cents. Graph values appear only from labelled synthetic fixtures. "Must not" criteria are release blockers, not preferences.

## Stories and acceptance criteria

### US-001 — Form a circle of existing friends

As an invited person, I want to join a named circle of people I already know, so planning stays inside my own friend group.

- **Given** a circle with fewer than six accepted members and a pending invitation for me, **when** I accept, **then** I become an accepted member and the circle lists me.
- **Given** a circle that already has six accepted members, **when** a seventh acceptance is attempted, **then** the request is rejected with an explicit size error and membership is unchanged.
- **Given** a circle with fewer than three accepted members, **when** any funded-planning action is attempted, **then** it is refused as not-ready and the refusal names the member minimum.
- **Given** I am not a member of a circle, **when** I request any of its circle, turn, plan, ledger or graph data, **then** access is denied and the response reveals no membership, amounts or names.
- **Given** I accept an invitation, **then** no contribution agreement, tracking consent or charge is created by that acceptance alone.

### US-002 — Agree the monthly contribution as a whole group

As a member, I want the contribution amount agreed by everyone, so money never becomes pressure.

- **Given** a proposed monthly amount, **when** it is validated, **then** it is accepted only as whole USD cents at most 1500, and the default proposal is 500; non-integer, negative, below-minimum (D-P01) and above-maximum values are rejected with a stated bound.
- **Given** a proposal awaiting agreement, **when** every current accepted member has explicitly agreed to that exact amount and membership version, **then** the circle records the agreement as complete.
- **Given** at least one member has not agreed, **then** the circle shows "not yet agreed" without naming or individually attributing who has not agreed, and no activation or collection proceeds. Agreement progress may be shown as an aggregate positive count ("2 of 4 agreed") provided no framing singles out the holdout; see PHASE1_REVIEW B-03 and RV-008 resolution note.
- **Given** a completed agreement, **when** the amount or accepted membership changes, **then** the prior agreement is invalidated for the new version and must be re-agreed; historical records are not rewritten.
- **Given** any agreement state, **then** no amount increase, renewal or re-agreement is ever inferred from silence, inactivity or app usage.

### US-003 — Take a fair turn as host

As a member, I want hosting to rotate predictably, so one person is not always organizing.

- **Given** a circle with stable accepted membership, **when** the rotation is computed, **then** the order is deterministic from accepted-member order with an immutable member-ID tie-break, identical across repeated computation.
- **Given** a stable-membership cycle, **when** it completes, **then** each member has been offered exactly one hosting turn.
- **Given** any rotation output, **then** the order never depends on tie strength, attendance, payment history or any closeness signal.
- **Given** a fixture month advance, **when** the demo operator advances it, **then** the next host follows the recorded order; wall-clock time alone never advances a turn or triggers collection.
- **Given** a membership change or pause during a cycle, **then** historical turns are preserved, stale host approvals are invalidated, affected advancement is suspended, and the unresolved reassignment rule (D-P02) is surfaced rather than guessed.

### US-004 — Understand the pot without being misled

As a member, I want to see what the circle could spend, labelled honestly.

- **Given** recorded ledger entries, **when** a prospective pot figure is shown, **then** it is derived by summing those entries at read time and never read from a stored mutable balance field.
- **Given** any pot display, **then** it is labelled as a conceptual budget, states that no provider funding is verified, and shows USD integer cents consistently.
- **Given** synthetic ledger entries, **then** they are labelled synthetic and are never presented as provider or payment evidence.
- **Given** any host action, **then** no path pays cash to the host or exposes a host withdrawal control.

### US-005 — Pause privately when money is tight

As a member in hardship, I want to pause without explaining myself to anyone.

- **Given** my member settings, **when** I request a pause, **then** the request succeeds without any reason field, free-text explanation, evidence upload or support conversation.
- **Given** a pause exists, **then** no reason is stored, because none is collected; and no peer, host, notification, prompt, analytics event or model input receives a reason.
- **Given** a pause exists, **when** other members view the circle, **then** they see at most a neutral participation state with no hardship framing, no comparison and no prompt to ask me why.
- **Given** a pause request, **then** collection effects, peer-visible status details and rotation consequences are shown as policy-pending (Q-006) and are not executed or implied as settled.
- **Given** any demo illustration of a paused member, **then** it shows participation-state only, labelled "demo only; payment effects not executed" (D-P04), with no implication that collection stopped or that any provider action occurred.
- **Given** I skip one event, **then** no pause or exit is created, and no penalty, streak loss or shame message follows.

### US-006 — Leave in two taps, with consequences disclosed up front

As a member, I want leaving to be easy and honest.

- **Given** an ordinary circle or settings surface, **when** I use the leave control, **then** reaching completion takes at most two activations — Leave, then Confirm — with keyboard and screen-reader equivalents counting as activations.
- **Given** the confirmation step, **then** it states the disclosed forfeit proposal and labels it as a proposal pending review (Q-006), never as an enforced legal outcome.
- **Given** the confirmation step, **when** I cancel, **then** nothing changes and no retention offer, discount, guilt message, delay or required reason is presented.
- **Given** I complete leaving, **then** my participation ends in the demo, no provider cancellation or refund result is claimed, and any pending provider state is shown as unverified. In demo illustrations no synthetic forfeiture, refund, subscription cancellation or successful pause-of-collection is presented as provider evidence (D-P04).
- **Given** I am the current host or a cycle is mid-flight, **then** leaving still succeeds; rotation consequences are suspended and surfaced rather than used to block my exit.

### US-007 — Opt in to connection tracking, or not

As a member, I want tracking to be my choice.

- **Given** onboarding, **then** connection-strength tracking is off until I make a separate affirmative choice; accepting the invitation or agreeing to the amount never enables it.
- **Given** I decline tracking, **then** I keep full circle participation: invitations, hosting turns, RSVPs and plan visibility are unaffected, and no feature nags me to enable it.
- **Given** tracking is off for me, **then** no interaction signal about me is recorded for graph computation, and no inferred edge involving me is created from other members' records.
- **Given** any tracking state, **then** the consent choice and its timestamp are retrievable by me, and the control to change it is reachable from ordinary settings.

### US-008 — Withdraw consent and have my edges disappear

As a member, I want withdrawal to actually remove my data from the graph.

- **Given** tracking was on and I withdraw, **when** any later graph computation runs, **then** every edge incident to me is excluded, including edges reconstructable from other members' retained records.
- **Given** withdrawal, **then** downstream uses — host guidance, drift candidates, prompts, model inputs, exports and demo visualizations — contain no edge or score involving me.
- **Given** withdrawal, **when** a cached or previously computed artifact exists, **then** it is invalidated before any subsequent use rather than served from cache.
- **Given** withdrawal, **then** my own-data access and deletion semantics are reported as policy-pending (Q-006) and are not silently resolved in either direction.
- **Given** withdrawal, **then** no notification, status badge or ranking reveals to peers that I withdrew.

### US-009 — Get exactly three plan options, or an honest "none"

As a host, I want a few good options without being managed by a machine.

- **Given** a host request with budget, fixed synthetic venues and stated availability, **when** generation succeeds, **then** exactly three distinct schema-valid plans are returned, each within the conceptual budget and drawn only from the approved fixed venue list.
- **Given** model output that fails schema validation, **when** the bounded retry (one regeneration, D-P03) also fails, **then** the response is an explicit "suggestions unavailable" and no partial list is presented as success.
- **Given** any generation attempt, **then** a one- or two-plan result is never shown as a complete suggestion set, and no fourth plan, invented venue, invented price or invented availability slot is produced.
- **Given** prompts are constructed, **then** they carry only first names and plan-relevant preferences — never emails, payment data, hardship information or numeric tie scores.
- **Given** suggestions are unavailable or unwanted, **then** I can browse the approved fixed venues or defer, and the same budget, turn and payment gates apply to a manually chosen plan.
- **Given** any suggestion, **then** nothing is auto-selected, nothing is booked, and no person is ranked.

### US-010 — Approve a plan deliberately

As a host, I want approval to be an explicit, unambiguous act.

- **Given** a candidate plan, **when** I approve, **then** the approval records the exact immutable plan version, venue, total USD cents, circle, my member identity and the current turn.
- **Given** a recorded approval, **when** the plan version, venue or amount differs at execution time, **then** the approval is treated as stale, execution is refused and re-approval is required.
- **Given** any approval path, **then** only deterministic code may act on it; no LLM, agent or suggestion step can approve, spend, book or re-authorize.
- **Given** I am not the current host, **when** I attempt approval, **then** it is denied without revealing host-only guidance.
- **Given** an approval exists, **then** the interface states that approval is not a payment and not a reservation.

### US-011 — See payment truth, not optimism

As a member, I want the app to distinguish intent from outcome.

- **Given** no genuine sandbox go/no-go evidence (YT-006) and no human money-flow approval, **when** any payment execution is attempted, **then** it is refused as blocked, with no simulated success substituted.
- **Given** subscription state, **then** created, approved, active and payment-received are distinct displayed states and none is inferred from another.
- **Given** an IOU balance, **then** owed, pending, paid and failed are distinct states, and paid is never displayed as a venue reservation or as attendance (LA-01; the Orders model was retired in ADR-0007).
- **Given** a provider webhook, **when** its signature is absent or invalid, **then** no ledger entry, status change or notification occurs.
- **Given** the same verified provider event delivered twice or out of order, **then** ledger effects occur at most once and the derived pot is unchanged by the duplicate.
- **Given** any payment failure, pending state or timeout, **then** the state is shown honestly as unverified or failed, never as completed.

### US-012 — Watch the synthetic graph change, clearly labelled

As a demo viewer, I want the drift illustration to be honest.

- **Given** the demo graph, **then** every node and edge comes from a labelled synthetic fixture, and the screen states that the people are fictional and the change is scripted.
- **Given** any user-facing graph view, **then** no real-person numeric tie score, ranking, percentile or drift warning is displayed to anyone, including through tooltips, exports or indirect visual proxies.
- **Given** the red-to-green illustration, **then** a text equivalent and a non-color cue convey the same change, and reduced-motion settings are respected.
- **Given** host-facing guidance, **then** it is phrased as a positive suggestion about a shared plan and never as a warning, score or diagnosis about named people.
- **Given** any request parameter or flag, **then** real member data can never be rendered through the synthetic demo path; the boundary is server-enforced, not client-selected.

### US-013 — Use the whole flow without a mouse or color vision

As a member using assistive technology, I want full access.

- **Given** any interactive control, **when** I navigate by keyboard, **then** it is reachable in a sensible order, has a visible focus indicator and exposes an accessible name and role.
- **Given** status, error and validation messages, **then** they are programmatically associated and announced, not conveyed by color or position alone.
- **Given** the graph and plan states, **then** the information is available as text, so no meaning depends on red/green perception.
- **Given** a reduced-motion preference, **then** transitions are minimized without removing information.
- **Given** this story, **then** it defines an audit target for YT-029; it is not a claim that WCAG 2.2 AA conformance has been assessed.

### US-014 — Find privacy and exit controls where I expect them

As a member, I want opt-out, pause and leave to be discoverable and unpunished.

- **Given** ordinary settings, **then** tracking off, withdrawal, pause and leave are each reachable without a support request, hidden menu or dark-pattern detour.
- **Given** any of these actions, **then** confirmation copy is neutral and free of guilt, loss framing and countdown pressure.
- **Given** any of these actions, **then** completing it never triggers a re-engagement sequence, and muting or declining a notification never starts one.
- **Given** any of these actions, **then** the resulting state and its unresolved policy boundaries are stated plainly rather than implied as final.

## Research

**Owner: UX Researcher (YT-012). Status: plan and hypotheses only.** No participant has been contacted, recruited, interviewed or observed, and **no findings exist**. Every person described below is an explicitly invented sketch, not a research result. Participant contact requires human approval plus Privacy review.

### Personas — invented sketches, not researched segments

| ID   | Sketch                                                  | Assumed need (untested)                                    | What would falsify it                                                                               |
| ---- | ------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| P-01 | The default organizer who currently plans everything    | Wants planning effort shared without having to ask         | Reports that rotation feels like lost control, or that others' turns produce plans they must rescue |
| P-02 | The willing non-planner who attends but never organizes | Wants hosting to feel achievable with low effort           | Reports that an assigned turn feels like obligation or exposure rather than help                    |
| P-03 | The budget-sensitive member                             | Wants participation without financial strain or disclosure | Reports that any shared fund, even at low amounts, creates pressure or unwanted visibility          |
| P-04 | The privacy-cautious member                             | Wants connection tracking to be refusable and invisible    | Reports that pairwise inference is unacceptable regardless of consent controls                      |

### Jobs to be done — hypotheses

- **JTBD-01:** When our group keeps drifting, help us turn vague intent into a specific plan someone owns.
- **JTBD-02:** When it is my turn, make choosing easy enough that I do not postpone it.
- **JTBD-03:** When money is tight, let me step back without a conversation about it.
- **JTBD-04:** When I distrust an app's data collection, let me participate anyway.

Each is a hypothesis about perceived value. None is evidence that YourTurn produces closeness, fairness or retention; `docs/04-behavioral/RESEARCH_NOTES.md` states what the cited literature does and does not support.

### Proposed study plan — blocked pending approval

1. **Question:** Do members correctly distinguish suggestion, approval, payment and reservation, and can they find and complete opt-out, pause and leave unaided?
2. **Design:** Up to five individually consenting volunteers, moderated task walkthrough on synthetic fixtures only; no real money, no real circles, no contact import.
3. **Consent:** Written, revocable at any time, with a stated right to skip any task. One member's agreement never enrols another. Refusal changes nothing else.
4. **Data minimization:** Task success/failure, observed confusion points, and verbatim quotes only with explicit permission. No hardship reasons, financial details, contact graphs or recordings without separate consent.
5. **Reporting:** Numerator and denominator stated, errors reported, no generalization beyond the sessions; suppress details that could identify a small group. Null and negative findings recorded.
6. **Stop conditions:** Any sign of coercion, distress or pressure between friends ends the session and triggers Behavioral and Privacy review.

## Unresolved user needs

- **Rotation exceptions (D-P02):** How turns resume after pause, decline or membership change is undecided, so the member experience of an interrupted cycle is unspecified.
- **Money consequences (Q-001, Q-006):** Whether contributions can fund a venue at all, and what forfeit, cancellation, refund and dispute mean for a leaving or paused member, are unresolved. Stories therefore require honest "pending" states instead of outcomes.
- **Graph visibility (Q-002):** Whether any real-user connection information may ever be shown, and how a host who is part of a flagged pair is handled, is unresolved; synthetic-only remains in force.
- **Own-data access (Q-006):** How a member sees their own interaction data without exposing a third party's data is unresolved.
- **Interpretation risk:** Whether people read a labelled synthetic drift graph as a judgement about their real friends is untested, and is a stated gap rather than an assumed non-issue.
- **Notification need:** Whether any reminder is wanted at all is untested; absent evidence, reminders stay optional, mutable and copy-reviewed (YT-013) rather than assumed necessary.
