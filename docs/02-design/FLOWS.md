# YourTurn flows

**Status:** Phase 1 draft for YT-011. **No screen is built.** These are the flows a future authorized implementation must follow; they are not evidence of an audited or shipped interface. Stories: [../01-product/USER_STORIES.md](../01-product/USER_STORIES.md). Contract: [../03-architecture/API.md](../03-architecture/API.md).
**Owner:** Product Designer. Copy wording belongs to Content Designer ([VOICE_AND_TONE.md](VOICE_AND_TONE.md), YT-013); accessibility audit belongs to Accessibility (YT-029).

Every flow below specifies the empty, loading, error and permission states, because a flow that only describes the happy path produces dishonest screens.

## Screen and state inventory

| Screen                         | Purpose                               | States                                                                               |
| ------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------ |
| S-01 Invitation                | Accept or decline membership          | loading, invitation valid, already resolved, circle full, declined                   |
| S-02 Circle home               | Members, readiness, pot, current turn | loading, not-ready (<3 accepted), awaiting agreement, ready, empty plan state        |
| S-03 Contribution agreement    | Propose and agree an amount           | loading, proposing, invalid amount, awaiting others, agreed, invalidated by change   |
| S-04 Your turn (host)          | Request plans, review, approve        | no suggestions yet, generating, three plans, unavailable, manual list, approved      |
| S-05 Plan detail               | One plan's venue and total            | loading, within budget, over budget, stale version                                   |
| S-06 Payment status            | Honest provider state                 | blocked, order created, payer approved, captured, failed, unverified/pending         |
| S-07 Privacy and participation | Consent, pause, leave                 | tracking off (default), tracking on, paused, leave confirmation, left                |
| S-08 Demo graph                | Synthetic drift illustration          | loading, before scene, after scene, reduced-motion, fixture missing                  |
| S-09 Error / permission        | Honest refusal                        | not found (also covers non-member), not host, validation, rate limited, server error |

**Navigation.** Mobile-first, single primary column. Top-level destinations: Circle home (S-02), Your turn (S-04, visible to everyone but actionable only by the host), Privacy and participation (S-07). S-08 is reachable from an explicitly labelled "Demo" entry, never presented as the member's own data. No modal traps: every overlay is dismissible by Escape and a visible Cancel.

## Join and consent

```text
S-01 Invitation
  ├─ [Decline] ─────────────▶ exit, nothing created
  └─ [Accept]  ─────────────▶ S-02 Circle home (member accepted)
                                  │
                                  ├─ banner: "Connection tracking is off" ──▶ S-07
                                  └─ banner: "Amount not yet agreed" ──────▶ S-03
```

- The invitation screen states, before acceptance: this is a sandbox demo with fictional data, what the proposed contribution is, that the forfeit text is a **proposal pending review**, and that accepting does **not** turn on tracking or start a charge.
- Tracking consent is a **separate** affirmative choice on S-07, default off, presented with equal visual weight for on and off. No pre-checked box, no bundled "accept all", no nag banner after a decline.
- Declining tracking leaves every other capability intact; S-02 shows no degraded or locked-looking state for that member.
- **Empty:** a circle with one accepted member shows "waiting for others" with the 3–6 rule stated.
- **Error:** `circle_full` renders as "this circle already has six members", not a generic failure.
- **Permission:** a non-member who follows a stale link sees S-09 not-found with no circle name, size or member list.

## Contribution and private pause

```text
S-03 Propose amount (default 500 cents, max 1500)
  → validate → awaiting agreement (agreed 2 of 4) → agreed
                        │
                        └─ amount or membership changes → invalidated → re-agree
```

- Amounts are shown as `$5.00` with the integer-cents value carried in the contract; the input accepts whole cents only and states the bound inline before submission.
- Progress is **aggregate**: "2 of 4 agreed". No screen names, counts down or highlights who has not agreed, and no reminder targets an individual.
- **Private pause (S-07):** one control, one confirmation, **no reason field anywhere** — no free text, no reason picker, no "tell us why" follow-up, no support ticket. The confirmation states that nobody is told why and that collection consequences are still being decided (Q-006).
- Peers see at most a neutral "paused" word on S-02. No hardship framing, no comparison, no prompt to ask the paused member about it.
- Skipping one event is not pausing: S-04/S-02 never convert a declined RSVP into a status change, streak loss or warning.
- **Error:** an invalid amount shows the permitted range and keeps the entered value for correction; a stale version shows "the proposal changed — review it again" with a link, never a silent overwrite.

## Host suggestion and explicit approval

```text
S-04 Your turn
  ├─ [Suggest three plans] ─▶ generating ─┬─▶ exactly three plans ─▶ S-05 ─▶ [Approve this plan]
  │                                       └─▶ "Suggestions unavailable" ─▶ [Browse venues] / [Decide later]
  └─ [Browse venues] ─────────────────────▶ fixed list ─────────────▶ S-05 ─▶ [Approve this plan]
```

- Exactly three plans, or an explicit unavailable state. **Two plans are never shown as a result**; the unavailable state offers the fixed venue list and "decide later", both without pressure.
- Nothing is preselected. There is no "best" badge, no ranking of people, no countdown and no auto-advance.
- Host-only reconnection guidance appears as a positive sentence about a shared plan ("something Sam and Priya would both enjoy"). No score, percentage, rank, warning icon, or red/amber treatment of a person is permitted anywhere.
- **Approval (S-05)** requires an explicit confirm step showing the exact plan, venue and total, and states plainly: approving is **not** a payment and **not** a reservation.
- **Stale:** if plan, venue or amount changed, the confirm step is replaced by "this plan changed — review and approve again".
- **Over budget:** the approve control is disabled with the derived budget and the plan total both shown; the pot is labelled a conceptual budget.
- **Permission:** non-hosts see the turn read-only, with no host-only guidance text present in the page at all.
- **Empty/loading:** "No suggestions yet" before any request; a bounded progress state while generating, with a visible cancel.

## Leave in two taps

```text
S-02 or S-07 ──[Leave circle]──▶ confirmation ──[Confirm]──▶ left
                                      └──[Cancel]──▶ unchanged
```

- Two activations maximum from an ordinary surface: **Leave**, then **Confirm**. Keyboard and screen-reader activation count identically; the control is not hidden behind a menu, a support page or a scroll-only region.
- The confirmation discloses the forfeit proposal, labels it as pending review rather than an enforced outcome, and says that provider cancellation and refund effects are **not** claimed by this action.
- **No dark patterns:** no retention offer, no discount, no "are you sure you want to abandon your friends", no artificial delay, no required reason, no survey gate, no asymmetric button styling that hides Cancel.
- Leaving works for the current host and mid-cycle; the resulting S-02 shows rotation as suspended pending a decided rule rather than silently reassigning.
- **Error:** a failed leave request shows a retry and explicitly states that membership is unchanged — never a false "you have left".

## Failure and cancellation

- **Payment states (S-06)** are distinct and labelled: _blocked_ ("payments are turned off in this demo" with the blocking reason), _order created_, _payer approved_, _captured_, _failed_, _unverified/pending_. No spinner resolves into an unverified success, and no screen shows a receipt or a booking confirmation from a capture.
- A capture never renders as "booked", "reserved" or "confirmed with the venue". Reservation is a separate concept the demo does not perform.
- Pending/timeout states say what is unknown and what the user can do (wait, re-check), without inventing a result.
- Validation errors are inline, tied to the field, and preserve input. Server errors offer retry and state that nothing was charged or changed.
- Rate limiting and server failure never surface raw provider payloads, identifiers or secrets.
- Cancellation paths (cancel a proposal, cancel a confirmation, dismiss a suggestion) always return to the prior state with nothing persisted.

## Synthetic demo graph boundary

- S-08 is labelled **"Demo — fictional people"** in the heading, not only in small print, and names the fixture revision.
- Every edge has: a color, a **non-color** encoding (line pattern: dotted = fading, solid = steady, double = reconnected), a state word, and a text equivalent sentence. The red-to-green illustration is therefore legible without color vision and without animation.
- A static text summary lists each pair and its state, so the same information exists outside the visualization.
- Reduced motion replaces the transition with an instant before/after toggle, keeping both scenes reachable; no information is motion-only.
- No real member's connection data is shown here, and no control on this screen (or any screen) switches the view to real data — the boundary is enforced by the server route, not by a toggle.
- **Fixture missing:** an explicit "demo data not loaded" state; never a placeholder graph that could be mistaken for real people.
- Nowhere in the product does a member see a numeric tie value, rank, percentile, drift warning or indirect proxy for closeness.

## Unresolved, blocking design decisions

| Item                       | Open question       | Design stance until resolved                                |
| -------------------------- | ------------------- | ----------------------------------------------------------- |
| Peer-visible pause detail  | Q-006               | Neutral word only; no reason, no icon implying hardship     |
| Forfeit / refund wording   | Q-006               | Labelled proposal pending review; no rights claimed         |
| Real-user graph visibility | Q-002               | Synthetic-only screen; no real-data view designed           |
| Rotation after pause/leave | PRD D-P02           | Show "advancement paused" rather than a guessed next host   |
| Any notification at all    | YT-013 + Behavioral | None designed yet; opt-in, mutable, dual-approved copy only |

## Accessibility sources and limits

Requirements above (focus visibility, non-color encoding, text equivalents, reduced motion, announced errors) are written against the W3C Web Content Accessibility Guidelines 2.2 recommendation and its Understanding documents.[1][2] WCAG 2.2 is the current W3C Recommendation and defines Level AA conformance criteria.[1]

**Limits:** citing the guidelines is not an audit. No YourTurn interface exists, so **no conformance claim is made or implied**; YT-029 must evaluate real screens with keyboard and screen-reader testing before any accessibility statement is published.

## Handoff to YT-013 (Content Designer)

Strings needed, by screen: S-01 demo/sandbox disclosure, forfeit-proposal disclosure; S-03 amount bound error, aggregate agreement progress; S-04 three-plan heading, unavailable state, host-only positive guidance pattern, defer option; S-05 approval confirmation including "not a payment, not a reservation"; S-06 all six payment states including the blocked explanation; S-07 tracking on/off, withdrawal effect, pause (no-reason) confirmation, leave confirmation with forfeit proposal; S-08 demo label, per-state text equivalents; S-09 refusal messages that disclose nothing about non-member circles. Every string must avoid guilt, loss framing and countdown pressure, and no notification copy exists until Content Designer and Behavioral Scientist both approve it.

## Sources

[1] https://www.w3.org/TR/WCAG22/ — Web Content Accessibility Guidelines (WCAG) 2.2, W3C Recommendation
[2] https://www.w3.org/WAI/WCAG22/Understanding/ — Understanding WCAG 2.2, W3C Web Accessibility Initiative
