# YourTurn voice and tone

**Status:** Phase 1 draft for YT-013, written after the PRD, flows and behavioral review. **No product string ships from this file**, and **no notification copy is approved** — every notification needs joint Content Designer + Behavioral Scientist approval of its exact text and timing (hard rule 3).
**Owner:** Content Designer. Behavioral constraints: [../04-behavioral/ETHICS_CHECKLIST.md](../04-behavioral/ETHICS_CHECKLIST.md), [../04-behavioral/PHASE1_REVIEW.md](../04-behavioral/PHASE1_REVIEW.md). Screens: [FLOWS.md](FLOWS.md).

## Voice: warm, optional, never guilt-inducing

Four properties, in priority order when they conflict:

1. **Honest first.** If something is unverified, pending, blocked or fictional, the string says so. Honesty outranks warmth: a cheerful sentence that implies a payment succeeded is a defect.
2. **Optional by default.** Invitations, not instructions. Prefer "you can" over "you should"; never imply obligation to friends.
3. **Plain and short.** Everyday words, active voice, second person. One idea per sentence. Numbers written as the user sees money (`$5.00`), with the exact amount always shown before any confirmation.
4. **Warm, not sentimental.** Friendly and calm. No exclamation stacking, no hype, no emotional pressure about relationships.

Mechanics: sentence case for headings and buttons; buttons name the action ("Approve this plan", not "OK"); errors say what happened and what the user can do; no idioms that assume a culture; no em-dash-heavy or ornate phrasing.

## Banned copy

Banned outright — any instance blocks release:

| Pattern                               | Example of what is banned                               | Use instead                                                  |
| ------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| Guilt / obligation                    | "You've let your friends down", "Sam is waiting on you" | "It's your turn when you're ready."                          |
| Loss framing                          | "Don't lose your spot", "You'll miss out"               | "You can join the next one."                                 |
| Countdown panic                       | "Only 2 hours left to pick!"                            | "There's no deadline for this."                              |
| Streak anxiety                        | "You broke your 5-month streak"                         | _(no streaks exist)_                                         |
| Confirm-shaming                       | "No thanks, I don't care about my friends"              | "Cancel"                                                     |
| Fake scarcity / social proof          | "3 circles like yours booked today"                     | _(omit)_                                                     |
| Ranking or scoring people             | "Your closest friend is Jo", "Connection score 0.42"    | _(never shown)_                                              |
| Drift as a warning about people       | "Your friendship with Priya is failing"                 | "Plan something Sam and Priya would both enjoy." (host only) |
| Implying a result that is unverified  | "Booked!", "Payment complete", "Reserved"               | See money strings below                                      |
| Blaming the user for a system failure | "You did something wrong"                               | "Something went wrong on our side. Nothing was changed."     |
| Asking why someone paused or left     | "Tell us why you're pausing"                            | _(no reason is ever requested)_                              |

Also banned: dark-pattern microcopy (hidden cancellation wording, pre-checked consent labels, "recommended" badges that steer a choice), and any string that names who has not agreed to an amount.

## Positive host suggestions

The only place reconnection guidance appears is the host's own turn, phrased as a positive suggestion about a **shared plan**:

- Allowed: "Sam and Priya haven't been at the same hangout in a while — something they'd both enjoy could be nice." Allowed: "Plan something Sam and Priya would both love."
- Banned: any score, percentage, rank, "drifting", "at risk", "failing", warning icon, or instruction to repair a relationship.
- The suggestion is never shown to the group, never shown to the named people as a notice, and never stored as a visible label on a person.
- If the host is one of the named pair, the string must not comment on the host's own closeness; this case is unresolved (Q-002) and no copy is approved for it yet.

## Notification dual approval

- **No notification exists today.** Whether YourTurn sends any reminder at all is untested (USER_STORIES "Unresolved user needs").
- Any future notification requires: opt-in, a working mute/decline, no follow-up sequence after a mute or decline, no countdown, no guilt, and **both** Content Designer and Behavioral Scientist approving the exact text, timing and frequency at a named revision.
- Declining or muting is never treated as a problem to recover from; it starts no re-engagement flow.
- A notification never contains drift information, another member's state, a pause, a hardship signal or an amount another member has not agreed to.

## Error and money disclosures

Required phrasings for the states in FLOWS S-06 and the gated contract responses:

| State                          | Required meaning the copy must carry                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Payment gate closed            | "Payments are turned off in this demo." Say that nothing was charged and that real payment is not enabled yet. |
| Approval recorded              | "Approved. This isn't a payment, and nothing is reserved with the venue yet."                                  |
| Order created / payer approved | Name the step precisely; do not imply completion.                                                              |
| Captured                       | "Payment captured in the sandbox." Never "booked", "reserved" or "confirmed with the venue".                   |
| Failed                         | "The payment didn't go through. Nothing is reserved." Offer a retry where one exists.                          |
| Unverified / pending           | "We don't have confirmation yet." State what is unknown; never resolve it optimistically.                      |
| Validation error               | Name the field and the limit: "Enter an amount between $1.00 and $15.00." Keep what was typed.                 |
| Non-member / not found         | Reveal nothing: "We couldn't find that." No circle name, size or member names.                                 |
| Not the host                   | "Only this month's host can do this." No host-only guidance in the message.                                    |
| Server error                   | "Something went wrong on our side. Nothing was changed." No provider payloads, ids or secrets.                 |

Standing money/demo disclosures: every money screen states sandbox-demo status and the currency; the forfeit text is always labelled a **proposal pending review**, never a rule; the pot is always labelled a conceptual budget with no verified funding; synthetic data is labelled fictional wherever it appears.

## Unresolved copy, blocked

| String set                                        | Blocked by                       |
| ------------------------------------------------- | -------------------------------- |
| Pause consequences and peer-visible pause wording | Q-006                            |
| Forfeit, refund, cancellation and dispute wording | Q-006, Legal                     |
| Any real-user connection wording                  | Q-002                            |
| Host-in-the-pair guidance                         | Q-002, Behavioral                |
| Rotation wording after pause or leave             | PRD D-P02                        |
| All notification text                             | Dual approval, not yet requested |

Until each is resolved, the drafts use the honest-pending phrasing above rather than inventing a policy in user-facing words.
