# Unspoken accessibility

**Task:** US-204 · **Role:** Accessibility (Vid) · **Target:** WCAG 2.2 Level AA · **Status:** design-stage audit done; **automated and keyboard app audit done (November 12, 2026); device screen-reader pass not yet done.**

> **No conformance claim.** Two audits are recorded here. The **design-stage** audit covers the tokens, [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [FLOWS.md](FLOWS.md) and [MOTION.md](MOTION.md). The **app-stage** audit covers all 19 routes of the built web app (`apps/web`, PR #53), in a browser, with axe-core, keyboard traversal, reflow, text-spacing and reduced-motion checks, plus a review of the accessibility tree each screen exposes. **Not done:** a hands-on pass with VoiceOver on an iPhone and TalkBack on Android. The accessibility tree is what those readers consume, but it does not prove how they announce it. Automated checks alone are not evidence of conformance, and this document does not claim it.
>
> **Independence.** The same person designed these screens and wrote this design-stage audit. The app-stage audit should be run or re-checked by someone other than the designer, and the independent Reviewer still gates the PR.

## Evidence that exists today

| Evidence                     | Where                                                          | What it proves                                                                                                                      |
| ---------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Computed contrast, 38 pairs  | `tests/design-tokens.test.mjs`                                 | Every documented text pair is ≥ 4.5:1 and every non-text pair ≥ 3:1, recomputed from `tokens.css` on every run                      |
| Touch target floor           | `tests/design-tokens.test.mjs`, `--target-min`                 | The token is ≥ 44px. It does **not** prove every built control uses it                                                              |
| Reduced motion               | `tests/design-tokens.test.mjs`, `tests/design-motion.test.mjs` | Every duration token is 0ms under `prefers-reduced-motion`; every moment has a text and a reduced-motion equivalent                 |
| Every screen has its states  | `tests/design-flows.test.mjs`                                  | All 23 screens specify Loading, Empty, Error and Refused                                                                            |
| Colour never the only signal | `tests/accessibility.test.mjs` and the register below          | Every place colour carries meaning has a named non-colour cue                                                                       |
| App-stage browser audit      | `tests/a11y/app-audit.mjs` (manual; results below)             | On all 19 routes: no axe WCAG 2.2 A/AA violation, titles, 44px targets, reflow at 320px and 200% text, text spacing, keyboard focus |
| App-stage regression guards  | `tests/web-accessibility.test.mjs` (in `npm test`)             | The fixes below stay in the source: titles, reduced motion, no faded text, toggle semantics, chips, live links                      |

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

Status key: **Designed** means the design addresses it, with a pointer to where. **Fixed here** means this audit found a gap and US-204 corrects the design. **Open** means a decision is needed. **Verified** means the app-stage audit checked it on the running screens. **App** means it still needs a running-screen check that automation cannot do.

| Criterion                                 | Status     | Design evidence / finding                                                                                                                                     |
| ----------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.1 Non-text content                    | Designed   | Icon-only controls carry labels (FLOWS rule 8). Line drawings and the balance thread are decorative. The map is decorative because the address is text (A-05) |
| 1.3.1 Info and relationships              | Open       | A-14: planner-card and option titles are paragraphs, not headings, so a screen reader cannot jump between options                                             |
| 1.3.2 Meaningful sequence                 | Designed   | P5 offers a List view, which is also the screen-reader order for the spatial bubble field (A-02)                                                              |
| 1.3.4 Orientation                         | Fixed here | A-04: orientation must not be locked; landscape shows the same centred column                                                                                 |
| 1.3.5 Identify input purpose              | Designed   | Phone `autocomplete="tel"`, code `one-time-code`, name `name`                                                                                                 |
| 1.4.1 Use of colour                       | Designed   | The register above                                                                                                                                            |
| 1.4.3 Contrast (minimum)                  | Designed   | 38 computed pairs; `--color-hairline` is decorative only (A-01)                                                                                               |
| 1.4.4 Resize text                         | Designed   | All type is `rem`; no text in images                                                                                                                          |
| 1.4.10 Reflow                             | Fixed here | A-03: the design target was 360px, but WCAG needs 320px. `--layout-floor: 320px` added                                                                        |
| 1.4.11 Non-text contrast                  | Designed   | Borders 3.48:1, the PayPal line 5.00:1, the focus ring 16.49:1                                                                                                |
| 1.4.12 Text spacing                       | Verified   | WCAG spacing overrides injected on all 18 content routes: no overflow, no clipped text                                                                        |
| 1.4.13 Content on hover or focus          | Designed   | No hover-only content (FLOWS rule 3)                                                                                                                          |
| 2.1.1 Keyboard                            | Verified   | Tab reaches every control on every route; voting, moving and withdrawing a vote work with Enter and Space alone                                               |
| 2.1.2 No keyboard trap                    | Designed   | Sheets close on Escape or system back and return focus                                                                                                        |
| 2.2.1 Timing adjustable                   | Open       | A-07: poll closing and stretch-ask expiry are group or real-time deadlines. Treated as the real-time exception; needs sign-off                                |
| 2.2.2 Pause, stop, hide                   | Designed   | Ambient motion rests after 5s (`--ambient-limit`, MOTION rule 3)                                                                                              |
| 2.3.1 Three flashes                       | Designed   | MOTION rule 4                                                                                                                                                 |
| 2.4.2 Page titled                         | Fixed here | A-11: every route was titled "Unspoken". Each now names its screen ("Settle up · Unspoken")                                                                   |
| 2.4.3 Focus order                         | Designed   | Reading order; sheets move focus in and back                                                                                                                  |
| 2.4.6 Headings and labels                 | Designed   | Labels sit above fields, never placeholder-only (P2)                                                                                                          |
| 2.4.7 Focus visible                       | Designed   | Focus ring tokens                                                                                                                                             |
| 2.4.11 Focus not obscured (minimum)       | Fixed here | A-06: the sticky dock and composer could cover a focused control. `--scroll-padding-bottom` added                                                             |
| 2.5.1 Pointer gestures                    | Designed   | No multipoint or path gesture is required. Swipe and long-press are only shortcuts                                                                            |
| 2.5.2 Pointer cancellation                | Verified   | Every control is a native button or link; no `onMouseDown`, `onTouchStart` or `onPointerDown` handler exists                                                  |
| 2.5.3 Label in name                       | Fixed here | A-16: the balance chip and lock badge replaced their visible text with different names. Vote buttons are now "Vote for <option>"                              |
| 2.5.7 Dragging movements                  | Designed   | No drag interaction is designed                                                                                                                               |
| 2.5.8 Target size (minimum)               | Designed   | 44px everywhere, exceeding the 24px floor                                                                                                                     |
| 3.2.3 Consistent navigation               | Designed   | Back is top left; the hub is bottom right on Home; primary actions are in the dock                                                                            |
| 3.2.6 Consistent help                     | Open       | A-08: the spec has no help mechanism. If one is added, it must sit in the same place on every screen                                                          |
| 3.3.1 Error identification                | Designed   | Inline errors in words on every screen (FLOWS Error rows)                                                                                                     |
| 3.3.3 Error suggestion                    | Designed   | Errors say what to do next                                                                                                                                    |
| 3.3.4 Error prevention (financial)        | Designed   | P13 confirm split, P14 PayPal approval, P12 confirm booking; each is reversible or confirmed                                                                  |
| 3.3.7 Redundant entry                     | Designed   | The phone number is prefilled from sign-in into P4 and P19                                                                                                    |
| 3.3.8 Accessible authentication (minimum) | Fixed here | A-09: the SMS code field allows paste and OS autofill (`one-time-code`), so no transcription is needed                                                        |
| 4.1.2 Name, role, value                   | Fixed here | A-12, A-13: contact rows were invalid listbox options; activity votes had no pressed state. Settings switches expose checked state                            |
| 4.1.3 Status messages                     | Designed   | New cards, vote changes, booking status and payment status go to a polite live region (FLOWS rule 8, MOTION)                                                  |

## Findings

| ID   | Severity | Finding                                                                                                                                           | Owner            | Status                                                                                                                 |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| A-01 | Low      | `--color-hairline` is 1.24:1 on paper                                                                                                             | Product Designer | Accepted: decorative only; DESIGN_SYSTEM forbids it as the only edge of a control                                      |
| A-02 | Medium   | P5's spatial bubble field has no inherent reading order for a screen reader                                                                       | Product Designer | Designed: List view toggle, also the DOM order                                                                         |
| A-03 | High     | The layout floor was 360px; WCAG 1.4.10 requires reflow at 320 CSS px                                                                             | Product Designer | **Fixed here:** `--layout-floor: 320px` and a DESIGN_SYSTEM row                                                        |
| A-04 | Medium   | Nothing said orientation stays unlocked; phone apps often lock portrait                                                                           | Product Designer | **Fixed here:** DESIGN_SYSTEM layout rule                                                                              |
| A-05 | Low      | The P17 static map had no text alternative stated                                                                                                 | Product Designer | **Fixed here:** decorative `alt=""`, address in text                                                                   |
| A-06 | High     | The sticky dock and composer can hide the focused control (2.4.11)                                                                                | Product Designer | **Fixed here:** `--scroll-padding-bottom` token and focus rule                                                         |
| A-07 | Medium   | Poll closing and stretch-ask expiry are deadlines a member cannot extend themselves (2.2.1)                                                       | Product Manager  | Open: argued as the real-time exception; the poll extends once automatically; needs PM sign-off                        |
| A-08 | Low      | No consistent help location (3.2.6 applies only if help exists)                                                                                   | Product Manager  | Open: propose a Help row in P20 under "Later"                                                                          |
| A-09 | High     | The SMS code entry could force transcription (3.3.8)                                                                                              | Product Designer | **Fixed here:** paste plus `one-time-code` autofill in FLOWS P2                                                        |
| A-10 | Medium   | Votes visible with names (spec) means a screen reader announces names on every vote change; this can be noisy in an 8-person pod                  | Frontend         | Open: the build has no live vote updates yet; when US-007 streaming lands, announce the delta ("Theo voted for Ramen") |
| A-11 | High     | Every route's document title was "Unspoken"; the root metadata title overwrote any per-screen title after hydration (2.4.2)                       | Accessibility    | **Fixed here:** `useDocumentTitle` in `ScreenHeader` and the 6 header-less pages; metadata title removed               |
| A-12 | High     | P6 contact rows were `<button role="option">` inside `<li>` inside `role="listbox"`: three axe violations, wrong announcements (4.1.2)            | Accessibility    | **Fixed here:** a plain list of toggle buttons with `aria-pressed`                                                     |
| A-13 | High     | P9 votes could not be changed or withdrawn, had no pressed state, and voters were shown as ids ("sam") rather than names                          | Accessibility    | **Fixed here:** single-choice toggle, `aria-pressed`, "Vote for <option>", first names including "You"                 |
| A-14 | Low      | Planner-card and option titles are paragraphs, not headings (1.3.1)                                                                               | Frontend         | Open                                                                                                                   |
| A-15 | High     | P7 "Demo actions" and poll vote counts were faded with `opacity-70`/`opacity-80` to 3.44–3.46:1 (1.4.3)                                           | Accessibility    | **Fixed here:** opacity removed                                                                                        |
| A-16 | Medium   | The balance chip was a `role="status"` live region on every row, and its and the lock badge's names differed from the visible text (2.5.3, 4.1.3) | Accessibility    | **Fixed here:** chips are plain text; the badge reads the spec's "Only you and your planner see this"                  |
| A-17 | High     | Splash spin and chat auto-scroll ignored reduced motion; there was no global reduced-motion rule (2.3.3, MOTION.md)                               | Accessibility    | **Fixed here:** global reduced-motion rule in `globals.css`; chat scrolls instantly under reduce                       |
| A-18 | Medium   | The P22 header lock badge wrapped into four lines and overflowed a 40px slot                                                                      | Accessibility    | **Fixed here:** the badge sits in the banner under the header                                                          |
| A-19 | Medium   | Home's "Money" link pointed to `/hub/money`, which does not exist (404)                                                                           | Accessibility    | **Fixed here:** links to `/money`; a test checks every in-app link resolves                                            |
| A-20 | Low      | P2 Terms and Privacy links were 15px tall                                                                                                         | Accessibility    | **Fixed here:** 44px hit area without changing the line                                                                |
| A-21 | Medium   | The sticky header and composer could hide a focused control (2.4.11, A-06 in the build)                                                           | Accessibility    | **Fixed here:** `scroll-padding-top`/`-bottom` in `globals.css`                                                        |

## App-stage audit (November 12, 2026)

**Build:** `main` at the merge of PRs #50–#55 (Alan's US-101–US-105 screens), `next dev`, system Chrome. **Viewports:** 390×844 and 320×844, touch enabled, `prefers-reduced-motion: reduce`. **Tool:** [`tests/a11y/app-audit.mjs`](../../tests/a11y/app-audit.mjs) (axe-core 4.11 with the WCAG 2.0/2.1/2.2 A and AA tags), plus manual review of each route's accessibility tree, screenshots and a keyboard-only voting walkthrough.

| Check                                 | Before fixes                         | After fixes        |
| ------------------------------------- | ------------------------------------ | ------------------ |
| axe WCAG 2.2 A/AA violations          | 9 nodes on 2 routes (P6, P7)         | 0 on all 19 routes |
| Descriptive document title            | 0 of 19 routes                       | 19 of 19           |
| Interactive elements under 44×44px    | 2 (P2 Terms, Privacy)                | 0                  |
| Horizontal overflow at 320px          | 0                                    | 0                  |
| Horizontal overflow at 200% text      | not measured                         | 0                  |
| Clipped text under WCAG text spacing  | not measured                         | 0                  |
| Controls without a visible focus ring | 0 (Next.js dev overlay excluded)     | 0                  |
| Broken in-app links                   | 1 (Home → Money)                     | 0                  |
| Reduced motion honoured               | No (splash spin, chat smooth scroll) | Yes                |

**Keyboard walkthrough (P9):** Tab to "Vote for Open Bowl Night", press Enter. It becomes pressed, and the voter line reads "2 votes · Sam, You". Tab to "Vote for Friday Escape Challenge" and press Space: the vote moves, and the first line returns to "1 vote · Sam". Press Enter again and the vote is withdrawn.

**Still to do by a person:** a 15-minute pass with VoiceOver (iPhone) and TalkBack (Android) over P2, P5, P7 (vote and ready check), P14 and P22, before the demo is recorded. This should ideally be done by someone other than the designer. Open findings A-07, A-08, A-10 and A-14 are listed above with owners.

**Re-running:** see the header of `tests/a11y/app-audit.mjs`. It exits non-zero on any problem it finds.

## Sources

[1] https://www.w3.org/TR/WCAG22/ — Web Content Accessibility Guidelines 2.2, W3C Recommendation.
[2] https://www.w3.org/WAI/WCAG22/Understanding/ — Understanding WCAG 2.2.
