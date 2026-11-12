# Unspoken accessibility

**Task:** US-204 · **Role:** Accessibility (Vid) · **Target:** WCAG 2.2 Level AA · **Status:** design-stage audit done; **app audit not performed.**

> **No conformance claim.** No Unspoken screen is built yet (US-101–US-105 are unclaimed). Everything below audits the **design**: the tokens, [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [FLOWS.md](FLOWS.md) and [MOTION.md](MOTION.md). Keyboard, screen-reader, zoom and reduced-motion testing of running screens is the remaining half of US-204. It cannot start until screens run, and US-204 stays BLOCKED until it does. Citing WCAG is not an audit, and automated checks alone are not evidence of conformance.
>
> **Independence.** The same person designed these screens and wrote this design-stage audit. The app-stage audit should be run or re-checked by someone other than the designer, and the independent Reviewer still gates the PR.

## Evidence that exists today

| Evidence                     | Where                                                          | What it proves                                                                                                      |
| ---------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Computed contrast, 38 pairs  | `tests/design-tokens.test.mjs`                                 | Every documented text pair is ≥ 4.5:1 and every non-text pair ≥ 3:1, recomputed from `tokens.css` on every run      |
| Touch target floor           | `tests/design-tokens.test.mjs`, `--target-min`                 | The token is ≥ 44px. It does **not** prove every built control uses it                                              |
| Reduced motion               | `tests/design-tokens.test.mjs`, `tests/design-motion.test.mjs` | Every duration token is 0ms under `prefers-reduced-motion`; every moment has a text and a reduced-motion equivalent |
| Every screen has its states  | `tests/design-flows.test.mjs`                                  | All 23 screens specify Loading, Empty, Error and Refused                                                            |
| Colour never the only signal | `tests/accessibility.test.mjs` and the register below          | Every place colour carries meaning has a named non-colour cue                                                       |

## Colour is never the only signal

Every place in the design where colour means something, paired with the cue that carries the same meaning without colour. The test fails if a row's non-colour cue is empty.

| Where          | Colour meaning                    | Non-colour cue                                                                       |
| -------------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| P14, P15       | Balance owed                      | Open-circle icon + the word "Owed"                                                   |
| P14, P15       | Balance pending                   | Dashed-circle icon + the word "Pending"                                              |
| P14, P15       | Balance paid                      | Filled circle with a tick + the word "Paid"                                          |
| P14, P15       | Balance failed                    | Circle with an exclamation mark + the word "Failed" + a private message              |
| P4.3, P19, P22 | Private (violet surface)          | Lock icon + "Only you and your planner see this" badge                               |
| P12, P13–P15   | Notice (simulated / sandbox)      | The words "Simulated booking" or "Sandbox — no real money"                           |
| P9, P10        | Vote selected                     | The words "Voted ✓" on the toggle + `aria-pressed` + your name in the voter list     |
| P11            | Ready-check answer                | The words In, Out or Not answered on every row                                       |
| P12            | Booking status                    | The words Waiting for confirmation, Booking, Booked or Couldn't book + an icon       |
| P5             | Pod bubble fill                   | The pod name on the bubble (the colour carries no meaning beyond telling pods apart) |
| P5, P7         | Stage cue                         | A stage word (Planning, Poll open…) + a glyph                                        |
| P18            | Unspoken hangout in the calendar  | The pod name on the event + a "Hangout" label                                        |
| P13–P15        | Balance thread (PayPal blue line) | Decorative (`aria-hidden`); each split line states "Theo owes Maya $23.34" in text   |
| Everywhere     | Error (failed-red text)           | An error icon + a sentence saying what happened, linked to the field                 |
| Everywhere     | Disabled button                   | A visible reason on or beside the button, as well as the greyed fill                 |
| Everywhere     | Focus                             | A 3px ring with a 2px gap: a shape change, not only a colour change                  |

## Criterion map (WCAG 2.2 AA)

Status key: **Designed** means the design addresses it, with a pointer to where. **Fixed here** means this audit found a gap and US-204 corrects the design. **Open** means a decision is needed. **App** means it can only be verified on running screens. Every row is **App** as well until the app-stage audit runs.

| Criterion                                 | Status     | Design evidence / finding                                                                                                                                     |
| ----------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.1 Non-text content                    | Designed   | Icon-only controls carry labels (FLOWS rule 8). Line drawings and the balance thread are decorative. The map is decorative because the address is text (A-05) |
| 1.3.1 Info and relationships              | App        | Cards need heading structure; the voter list needs to be a real list. Specify during build                                                                    |
| 1.3.2 Meaningful sequence                 | Designed   | P5 offers a List view, which is also the screen-reader order for the spatial bubble field (A-02)                                                              |
| 1.3.4 Orientation                         | Fixed here | A-04: orientation must not be locked; landscape shows the same centred column                                                                                 |
| 1.3.5 Identify input purpose              | Designed   | Phone `autocomplete="tel"`, code `one-time-code`, name `name`                                                                                                 |
| 1.4.1 Use of colour                       | Designed   | The register above                                                                                                                                            |
| 1.4.3 Contrast (minimum)                  | Designed   | 38 computed pairs; `--color-hairline` is decorative only (A-01)                                                                                               |
| 1.4.4 Resize text                         | Designed   | All type is `rem`; no text in images                                                                                                                          |
| 1.4.10 Reflow                             | Fixed here | A-03: the design target was 360px, but WCAG needs 320px. `--layout-floor: 320px` added                                                                        |
| 1.4.11 Non-text contrast                  | Designed   | Borders 3.48:1, the PayPal line 5.00:1, the focus ring 16.49:1                                                                                                |
| 1.4.12 Text spacing                       | App        | No fixed-height text containers in the design; verify with a spacing bookmarklet                                                                              |
| 1.4.13 Content on hover or focus          | Designed   | No hover-only content (FLOWS rule 3)                                                                                                                          |
| 2.1.1 Keyboard                            | App        | All actions have visible controls. Verify with an external keyboard and Switch Control                                                                        |
| 2.1.2 No keyboard trap                    | Designed   | Sheets close on Escape or system back and return focus                                                                                                        |
| 2.2.1 Timing adjustable                   | Open       | A-07: poll closing and stretch-ask expiry are group or real-time deadlines. Treated as the real-time exception; needs sign-off                                |
| 2.2.2 Pause, stop, hide                   | Designed   | Ambient motion rests after 5s (`--ambient-limit`, MOTION rule 3)                                                                                              |
| 2.3.1 Three flashes                       | Designed   | MOTION rule 4                                                                                                                                                 |
| 2.4.2 Page titled                         | App        | Each screen sets a title naming the screen and the pod                                                                                                        |
| 2.4.3 Focus order                         | Designed   | Reading order; sheets move focus in and back                                                                                                                  |
| 2.4.6 Headings and labels                 | Designed   | Labels sit above fields, never placeholder-only (P2)                                                                                                          |
| 2.4.7 Focus visible                       | Designed   | Focus ring tokens                                                                                                                                             |
| 2.4.11 Focus not obscured (minimum)       | Fixed here | A-06: the sticky dock and composer could cover a focused control. `--scroll-padding-bottom` added                                                             |
| 2.5.1 Pointer gestures                    | Designed   | No multipoint or path gesture is required. Swipe and long-press are only shortcuts                                                                            |
| 2.5.2 Pointer cancellation                | App        | Activate on up-event; verify vote and yes/no buttons                                                                                                          |
| 2.5.3 Label in name                       | App        | Visible label text must start the accessible name ("Voted ✓", not "toggle")                                                                                   |
| 2.5.7 Dragging movements                  | Designed   | No drag interaction is designed                                                                                                                               |
| 2.5.8 Target size (minimum)               | Designed   | 44px everywhere, exceeding the 24px floor                                                                                                                     |
| 3.2.3 Consistent navigation               | Designed   | Back is top left; the hub is bottom right on Home; primary actions are in the dock                                                                            |
| 3.2.6 Consistent help                     | Open       | A-08: the spec has no help mechanism. If one is added, it must sit in the same place on every screen                                                          |
| 3.3.1 Error identification                | Designed   | Inline errors in words on every screen (FLOWS Error rows)                                                                                                     |
| 3.3.3 Error suggestion                    | Designed   | Errors say what to do next                                                                                                                                    |
| 3.3.4 Error prevention (financial)        | Designed   | P13 confirm split, P14 PayPal approval, P12 confirm booking; each is reversible or confirmed                                                                  |
| 3.3.7 Redundant entry                     | Designed   | The phone number is prefilled from sign-in into P4 and P19                                                                                                    |
| 3.3.8 Accessible authentication (minimum) | Fixed here | A-09: the SMS code field allows paste and OS autofill (`one-time-code`), so no transcription is needed                                                        |
| 4.1.2 Name, role, value                   | App        | Vote toggles use `aria-pressed`; switches expose on/off                                                                                                       |
| 4.1.3 Status messages                     | Designed   | New cards, vote changes, booking status and payment status go to a polite live region (FLOWS rule 8, MOTION)                                                  |

## Findings

| ID   | Severity | Finding                                                                                                                          | Owner            | Status                                                                                          |
| ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| A-01 | Low      | `--color-hairline` is 1.24:1 on paper                                                                                            | Product Designer | Accepted: decorative only; DESIGN_SYSTEM forbids it as the only edge of a control               |
| A-02 | Medium   | P5's spatial bubble field has no inherent reading order for a screen reader                                                      | Product Designer | Designed: List view toggle, also the DOM order                                                  |
| A-03 | High     | The layout floor was 360px; WCAG 1.4.10 requires reflow at 320 CSS px                                                            | Product Designer | **Fixed here:** `--layout-floor: 320px` and a DESIGN_SYSTEM row                                 |
| A-04 | Medium   | Nothing said orientation stays unlocked; phone apps often lock portrait                                                          | Product Designer | **Fixed here:** DESIGN_SYSTEM layout rule                                                       |
| A-05 | Low      | The P17 static map had no text alternative stated                                                                                | Product Designer | **Fixed here:** decorative `alt=""`, address in text                                            |
| A-06 | High     | The sticky dock and composer can hide the focused control (2.4.11)                                                               | Product Designer | **Fixed here:** `--scroll-padding-bottom` token and focus rule                                  |
| A-07 | Medium   | Poll closing and stretch-ask expiry are deadlines a member cannot extend themselves (2.2.1)                                      | Product Manager  | Open: argued as the real-time exception; the poll extends once automatically; needs PM sign-off |
| A-08 | Low      | No consistent help location (3.2.6 applies only if help exists)                                                                  | Product Manager  | Open: propose a Help row in P20 under "Later"                                                   |
| A-09 | High     | The SMS code entry could force transcription (3.3.8)                                                                             | Product Designer | **Fixed here:** paste plus `one-time-code` autofill in FLOWS P2                                 |
| A-10 | Medium   | Votes visible with names (spec) means a screen reader announces names on every vote change; this can be noisy in an 8-person pod | Frontend         | App: announce the delta ("Theo voted for Ramen"), not the full list                             |

## App-stage audit plan (not yet run)

When US-101–US-105 produce runnable screens:

1. **Devices:** iPhone with VoiceOver, Android with TalkBack, and an external keyboard with each. Narrow viewport at 320px and at 200% text size.
2. **Per screen P1–P23:** focus order, names and roles, live-region announcements, every Loading/Empty/Error/Refused state reached and announced, targets ≥ 44px measured, nothing hidden under the dock.
3. **Reduced motion** on at the OS level: every moment in MOTION.md shows its reduced equivalent.
4. **Contrast** re-measured on rendered pixels, including text over bubbles and the private surface.
5. **Record** each failure with criterion, severity, steps to reproduce, owner and a retest result in this file.

## Sources

[1] https://www.w3.org/TR/WCAG22/ — Web Content Accessibility Guidelines 2.2, W3C Recommendation.
[2] https://www.w3.org/WAI/WCAG22/Understanding/ — Understanding WCAG 2.2.
