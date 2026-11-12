# Unspoken design system

**Task:** US-201 · **Owner:** Product Designer (Vid) · **Status:** draft for review. Tokens are implemented in [`apps/web/src/styles/tokens.css`](../../apps/web/src/styles/tokens.css) and enforced by [`tests/design-tokens.test.mjs`](../../tests/design-tokens.test.mjs). No screen is built yet; the screens are specified in [FLOWS.md](FLOWS.md) (US-202).

**Source of truth:** [Unspoken Experience and Pages Spec](source/Unspoken%20Experience%20and%20Pages%20Spec.pdf) (18 pages, ADR 0007). Where this document and the PDF disagree, the PDF wins and this document is the defect. Strings belong to the Content Designer ([VOICE_AND_TONE.md](VOICE_AND_TONE.md)); quoted copy here is placeholder intent, not approved text.

This replaces the YourTurn design system (circles, pot, drift graph). None of those components exist in Unspoken.

## Principles

1. **Phone in one hand.** Every screen is one column at 360–430 CSS px. Primary actions sit in the bottom third, in thumb reach. Desktop centres the same column; it is a courtesy, not a layout.
2. **Private looks private.** Anything only the member and their planner can see (limits, stretch asks, private reminders) carries the violet private treatment and the lock badge. Anything the pod can see never does. A member must be able to tell at a glance which world they are in.
3. **The pod sees one conversation.** Planner work arrives as cards inside the pod chat, not as separate screens. Cards are the only place a hangout's state is shown to the pod.
4. **Calm, not urgent.** No countdown timers, no red badges on people, no streaks. Reminders are private. A closing time is stated as a time, not a ticking clock.
5. **Honest labels.** Simulated booking says it is simulated. Sandbox money says it is sandbox. A "paid" state never reads as "confirmed with the venue".
6. **PayPal blue is line art only.** It draws; it never fills (spec p.15).

## Layout

| Token                         | Value                      | Use                                                                                        |
| ----------------------------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| `--layout-min`                | 360px                      | Narrowest designed width. Nothing truncates or overflows here; long names wrap.            |
| `--layout-max`                | 430px                      | Widest designed width. Wider viewports centre a 430px column on `--color-paper`.           |
| `--gutter`                    | `clamp(16px, 4.5vw, 20px)` | Left/right page padding.                                                                   |
| `--safe-top`, `--safe-bottom` | `env(safe-area-inset-*)`   | Added to the app bar and bottom dock so nothing sits under a notch or home indicator.      |
| `--bar-height`                | 56px                       | Top app bar: back, title, one trailing action.                                             |
| `--dock-height`               | 72px                       | Bottom dock: the screen's primary action, or the chat composer. Always inside thumb reach. |

**Rules.** One column, no side-by-side panes. Horizontal scroll only inside a clearly bounded carousel (none planned). Sheets rise from the bottom; full-screen modals are only for the P4 stepper and PayPal hand-off. At 200% text size the layout reflows vertically. Nothing clips, and the primary action stays reachable by scrolling.

## Touch

| Token                  | Value | Rule                                                                                  |
| ---------------------- | ----- | ------------------------------------------------------------------------------------- |
| `--target-min`         | 44px  | Every interactive element's hit area, including chips, vote buttons and icon buttons. |
| `--target-comfortable` | 48px  | Primary buttons, vote and yes/no buttons on cards, the plus button.                   |
| `--target-gap`         | 8px   | Minimum space between adjacent targets so a thumb does not hit the neighbour.         |

**No hover-only affordance.** Nothing is revealed only on hover. There are no tooltips that hold information, and no actions that exist only on long-press or swipe. A long-press or swipe can be a shortcut, but the same action must also have a visible control.

## Colour

All values are in `tokens.css`. The contrast figures below are **computed** with the WCAG relative-luminance formula, and the test recomputes them on every run. They measure the palette. They do not claim the product conforms; that is US-204.

### Neutrals and action

| Token                        | Value     | Use                                                                | Contrast                          |
| ---------------------------- | --------- | ------------------------------------------------------------------ | --------------------------------- |
| `--color-paper`              | `#FBFAF7` | Page background                                                    | —                                 |
| `--color-surface`            | `#FFFFFF` | Cards, sheets, other people's chat bubbles                         | —                                 |
| `--color-surface-sunken`     | `#F3F2EE` | Composer, grouped rows, your own chat bubbles                      | ink 15.36:1                       |
| `--color-ink`                | `#1C1B19` | Primary text, icons                                                | 16.49:1 on paper                  |
| `--color-ink-muted`          | `#5C5953` | Secondary text, timestamps                                         | 6.69:1 on paper, 6.23:1 on sunken |
| `--color-border`             | `#8A867D` | Input outlines, unselected vote buttons, any boundary that matters | 3.48:1 on paper (non-text, 3:1)   |
| `--color-hairline`           | `#E4E2DC` | Decorative dividers only — never the only edge of a control        | 1.24:1, decorative, exempt        |
| `--color-action`             | `#1C1B19` | Primary button fill                                                | —                                 |
| `--color-on-action`          | `#FFFFFF` | Text on primary button                                             | 17.21:1                           |
| `--color-action-pressed`     | `#3A3833` | Pressed primary button                                             | on-action 11.71:1                 |
| `--color-action-disabled`    | `#E4E2DC` | Disabled button fill                                               | —                                 |
| `--color-on-action-disabled` | `#5C5953` | Disabled button text (still readable)                              | 5.39:1                            |
| `--color-focus`              | `#1C1B19` | Focus ring                                                         | 16.49:1 on paper                  |
| `--color-focus-gap`          | `#FBFAF7` | Gap between control and ring, so the ring shows on dark fills too  | —                                 |

Buttons are ink, not a brand colour. That keeps PayPal blue off every button, and it keeps the bubbles and cards as the colour in the app.

### PayPal line art

| Token                 | Value     | Use                                                                                         | Contrast                   |
| --------------------- | --------- | ------------------------------------------------------------------------------------------- | -------------------------- |
| `--color-paypal-line` | `#0070BA` | Strokes only: empty-state drawings, the balance thread (P13–P15), the P21 link illustration | 5.00:1 on paper (non-text) |

**PayPal blue is line art only, never a fill, a button, a background, or text** (spec p.15). Strokes use `--stroke-line-art` (1.5px) and `--stroke-thread` (2px). The "Pay with PayPal" control on P14 is an ink button that names PayPal in its label. If PayPal's own button is ever required, it is PayPal's asset under PayPal's rules, not this token. The hex value is a placeholder until it is checked against PayPal's brand guidance. The test fails if any other token holds this value or a saturated blue.

### Private

| Token                     | Value     | Use                                                                | Contrast                  |
| ------------------------- | --------- | ------------------------------------------------------------------ | ------------------------- |
| `--color-private`         | `#4E3A75` | Lock badge text and icon, private card accent, private-chat header | 8.27:1 on private surface |
| `--color-private-surface` | `#F1ECF7` | Private limits section (P4 step 3, P19), stretch-ask card (P22)    | ink-muted 6.01:1          |

Violet is reserved for "only you and your planner see this". It never appears in a pod chat, on a bubble, or on a balance.

### Balance status

Status is **always icon + word + colour**, never colour alone.

| Status  | Text token               | Surface token                    | Icon                   | Contrast |
| ------- | ------------------------ | -------------------------------- | ---------------------- | -------- |
| Owed    | `--color-status-owed`    | `--color-status-owed-surface`    | open circle            | 6.04:1   |
| Pending | `--color-status-pending` | `--color-status-pending-surface` | dashed circle (static) | 6.23:1   |
| Paid    | `--color-status-paid`    | `--color-status-paid-surface`    | filled circle + tick   | 6.17:1   |
| Failed  | `--color-status-failed`  | `--color-status-failed-surface`  | circle + exclamation   | 6.34:1   |

These colours describe **a balance**, never a person. A member's avatar or name is never tinted by what they owe.

### Honesty notice

| Token                    | Value     | Use                                                              | Contrast |
| ------------------------ | --------- | ---------------------------------------------------------------- | -------- |
| `--color-notice`         | `#6B4E00` | Text of a "Simulated booking" or "Sandbox — no real money" label | 7.06:1   |
| `--color-notice-surface` | `#FFF4D6` | That label's background                                          | —        |

### Pod bubbles

Six decorative fills, assigned to a pod at creation and never re-coloured by state: `--color-bubble-1` peach `#F7E4D4`, `--color-bubble-2` sage `#E2EDDF`, `--color-bubble-3` lilac `#E8E2F3`, `--color-bubble-4` butter `#F5EBC4`, `--color-bubble-5` rose `#F3DDE1`, `--color-bubble-6` stone `#E4E9E3`. Ink on each is 13.31–14.39:1, and ink-muted is 5.40–5.84:1. A bubble's colour means nothing. It is only there to tell pods apart, so the pod name is always on the bubble too.

## Typography

| Token            | Size      | Family | Use                                                        |
| ---------------- | --------- | ------ | ---------------------------------------------------------- |
| `--text-display` | 2rem      | serif  | The two money totals on P15, the splash wordmark           |
| `--text-heading` | 1.5rem    | serif  | Screen titles                                              |
| `--text-title`   | 1.25rem   | sans   | Card and sheet titles, pod name on a bubble                |
| `--text-body`    | 1.0625rem | sans   | Body, chat messages, inputs (17px, the phone body default) |
| `--text-small`   | 0.9375rem | sans   | Metadata, helper text, **all disclosures**                 |
| `--text-caption` | 0.8125rem | sans   | Timestamps, chip labels. Never carries a disclosure.       |

- `--font-serif` (`ui-serif`, New York, Georgia) for headings echoes the spec's serif titles. `--font-sans` (system UI) is used for everything else. No webfont download.
- All sizes are `rem`, so the phone's text-size setting scales them. Nothing goes below 13px.
- Money uses `--font-numeric-variant: tabular-nums` so amounts line up. Budgets show whole dollars (`$40`). Money owed shows dollars and cents (`$23.34`). Both follow spec p.3.
- Weights: `--weight-regular` 400, `--weight-medium` 500, `--weight-semibold` 600. Emphasis never relies on colour alone.

## Spacing, shape, elevation

- **Spacing:** a 4px grid, from `--space-1` (4px) to `--space-9` (48px). Card padding is `--space-4`. Spacing between cards in the chat stream is `--space-3`. Spacing between sections is `--space-7`.
- **Radius:** `--radius-chip` 8, `--radius-control` 14, `--radius-card` 20, `--radius-sheet` 28, `--radius-pill` 999. `--radius-bubble` is an asymmetric radius that gives pod bubbles their organic shape without an image asset.
- **Elevation:** `--shadow-card`, `--shadow-sheet`, `--shadow-bubble`. Shadows separate layers. They never mean "important" or "selected".

## Motion (base scale)

`--duration-instant` 80ms, `--duration-fast` 140ms, `--duration-base` 240ms, `--duration-slow` 420ms, `--duration-ambient` 14s (bubble drift). Easings: `--easing-standard`, `--easing-enter`, `--easing-exit`, `--easing-settle` (a small overshoot used only for the booking pop). Under `prefers-reduced-motion: reduce` every duration becomes `0ms`, and the test enforces this. Each moment (logo turn, bubble drift, card arrival, booking pop, balance thread and the rest) has its own `--duration-*` token, a text equivalent and a reduced-motion equivalent in [MOTION.md](MOTION.md) (US-203). Ambient motion rests after `--ambient-limit` (5s).

## Focus

A visible ring on every focusable element: `--focus-ring-width` 3px of `--color-focus`, offset by `--focus-ring-offset` 2px of `--color-focus-gap`. It is never removed without an equivalent. Focus order follows reading order. A sheet traps focus while it is open, closes on Escape or the system back gesture, and returns focus to the control that opened it.

## Components

Every component must define **default, pressed, focus-visible, disabled (with a visible reason), loading, empty, and error** states wherever they apply. A component without its error and empty states is incomplete. Screens and their states are in [FLOWS.md](FLOWS.md).

| Component                 | Where          | Rules                                                                                                                                                                                                                                                       |
| ------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button                    | everywhere     | Primary is an ink fill, secondary is an outline with `--color-border`, destructive is an outline with failed-red text. Minimum height `--target-comfortable`. Confirm and Cancel have equal weight in any destructive or money step.                        |
| Pod bubble                | P5             | Organic shape, a `--color-bubble-n` fill, pod name, member count, and a stage cue. Size varies by layout only, never by activity or "importance".                                                                                                           |
| Stage cue                 | P5 bubble, P7  | One of: none, planning, poll open, booking pending, payments open. Shown as a word plus a small glyph. **Never shows a single member's status** and never names anyone.                                                                                     |
| Hub entry                 | P5             | A persistent button at the bottom right of Home that opens the hub sheet (P15–P22). It carries a dot when there is a private ask. The dot always comes with a text label in the sheet ("1 private ask").                                                    |
| Chat message              | P7, P22        | Others' messages on `--color-surface`, yours on `--color-surface-sunken`. Name and time always shown. The planner is a named participant with its own avatar, never disguised as a member.                                                                  |
| Planner card              | P7             | A `--color-surface` card with a `--radius-card` corner and a header naming the card type. Shortlist, time poll, ready check, booking confirmation and payer-and-split cards share one shell.                                                                |
| Activity option           | P9             | Title, venue or organizer, date and time, about-per-person cost, tags, and a vote button. **No "budget-friendly", "why this one", "recommended" or ranking badge.**                                                                                         |
| Vote button + voter names | P9, P10        | A toggle button that states whether it is selected in text ("Voted") as well as with a filled style. **Voter first names are listed under each option.** Avatars, if any, are paired with the name. Votes are attributed, as the spec requires (see Q-013). |
| Ready-check row           | P11            | Member name and their answer as a word: In, Out, or Not answered. Your own row has the yes/no buttons. A PayPal-unlinked member sees why Yes is disabled, plus a link to P21.                                                                               |
| Status chip               | P12            | Waiting for confirmation, Booking, Booked (simulated), or Couldn't book. Each is a word and an icon. "Booked" in the demo always carries the notice label "Simulated booking".                                                                              |
| Split line                | P13            | Member name, then their share in dollars and cents. Only yes-members appear. The payer is labelled "Paid the venue".                                                                                                                                        |
| Balance row               | P14, P15       | Who, which hangout, amount, and a status chip (owed, pending, paid or failed, each with icon and word). Tapping it opens P14.                                                                                                                               |
| Money total               | P15            | Two figures in `--text-display`: "You owe" and "You're owed". Plain numbers, no colour judgement.                                                                                                                                                           |
| Lock badge                | P4.3, P19, P22 | A lock icon plus "Only you and your planner see this", in `--color-private` on `--color-private-surface`. It stays in view while the private section is visible.                                                                                            |
| Stretch-ask card          | P22 only       | Option, cost, "Is a different budget okay for this one time?", and Yes and No at equal weight. A private surface. **Never rendered in a pod.**                                                                                                              |
| Understood-limits chips   | P22            | Editable chips showing what the planner understood, plus a Confirm button. Nothing is saved until Confirm is pressed.                                                                                                                                       |
| Interest picker           | P4.2, P19      | Multi-select chips, each `--target-min` tall, selected state shown with a tick and a fill. Uses the fixed list (Q-011 #16).                                                                                                                                 |
| Notice label              | P12, P13–P15   | `--color-notice` on `--color-notice-surface`: "Simulated booking", "Sandbox — no real money". Rendered at `--text-small` or larger and never truncated.                                                                                                     |
| Permission prompt         | P4.6, P6       | Permission name, a one-line reason, and Allow and Not now at equal weight. Declining leaves a working path (an invite link, times in the private chat, in-app reminders).                                                                                   |
| Empty state               | P5, P15, P16   | A PayPal-blue line drawing, one sentence on what is missing, and one voluntary next step. No guilt framing.                                                                                                                                                 |
| Inline error              | everywhere     | Said in words next to the field or card. It says what happened and what you can do, and it never auto-dismisses. Money errors say that nothing was charged where that is true.                                                                              |
| Offline banner            | P7, P14, P15   | "You're offline. Showing what we had." Money actions are disabled and the reason is shown on the button.                                                                                                                                                    |

**Never build:** leaderboards, streaks, scores or rankings of people, a per-member status on a bubble, red badges on a person, countdown timers, "budget-friendly" or "why this one" labels, pre-checked consent, auto-dismissing errors, reminders posted into the pod chat, or any rendering of a member's private limits or stretch answer to anyone else.

## Open items that affect design

| Item                                                   | Blocked by            | Design stance until resolved                                                       |
| ------------------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------- |
| Who confirms a booking (P12 confirm button visibility) | Q-011 #6              | Design the button for "the payer", as the spec recommends; state it as provisional |
| How the payer is chosen (P13)                          | Q-011 #5              | A volunteer control plus a planner suggestion, per the recommendation              |
| Who sees which balances (P15)                          | Q-011 #14             | Show only balances you are part of                                                 |
| Whether one member or each member pays the $15 (P3)    | Q-011 #1, #2          | P3 shows a per-member plan; no trial copy                                          |
| Fixed interest list (P4.2)                             | Q-011 #16             | Picker designed for any list length; chips wrap                                    |
| Votes visible with names                               | Q-013                 | Follow the spec (names shown); Privacy/Behavioral record the choice                |
| Dark mode                                              | Not in spec           | Light only for the demo; tokens are named by role, so a dark set can be added      |
| PayPal brand value for `--color-paypal-line`           | PayPal brand guidance | `#0070BA` placeholder                                                              |

## Sources

[1] https://www.w3.org/TR/WCAG22/ — WCAG 2.2 (1.4.3 contrast minimum, 1.4.11 non-text contrast, 1.4.10 reflow, 2.4.7 focus visible, 2.5.8 target size minimum)
[2] The UX spec PDF above, pages 1–3 (rules), 5–12 (pages), 13–15 (permissions, notifications, edge cases, motion).
