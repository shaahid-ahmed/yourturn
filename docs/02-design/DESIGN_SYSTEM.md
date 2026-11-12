# YourTurn design system

**Status:** Phase 1 draft for YT-011. **Documentation only — no tokens, components or CSS are implemented.** Token values here are a proposal for `apps/web/src/styles/tokens.*` after the YT-014 freeze. Flows: [FLOWS.md](FLOWS.md). Stories: [../01-product/USER_STORIES.md](../01-product/USER_STORIES.md).
**Owner:** Product Designer. Strings: Content Designer ([VOICE_AND_TONE.md](VOICE_AND_TONE.md)). Audit: Accessibility (YT-029).

## Tokens

### Color

Contrast ratios below were **computed** from these hex values against the WCAG relative-luminance formula; they are stated so the audit (YT-029) can re-verify rather than trust a claim.

| Token                       | Value     | Use                               | Contrast (computed)           |
| --------------------------- | --------- | --------------------------------- | ----------------------------- |
| `--color-ink`               | `#13212B` | Primary text                      | 16.40:1 on surface            |
| `--color-ink-muted`         | `#4A5A66` | Secondary text, metadata          | 7.13:1 on surface             |
| `--color-surface`           | `#FFFFFF` | Page and card background          | —                             |
| `--color-surface-sunken`    | `#F2F5F7` | Grouped panels                    | ink 14.98:1, ink-muted 6.51:1 |
| `--color-border`            | `#64727C` | Borders, dividers, input outlines | 4.95:1 on surface             |
| `--color-accent`            | `#1F5F8B` | Primary action, links             | 6.84:1 on surface             |
| `--color-accent-contrast`   | `#FFFFFF` | Text on accent fill               | 6.84:1 on accent              |
| `--color-state-fading`      | `#8A3A1E` | Graph "fading" edge               | 7.76:1 on surface             |
| `--color-state-steady`      | `#4A5A66` | Graph "steady" edge               | 7.13:1 on surface             |
| `--color-state-reconnected` | `#1C6B4A` | Graph "reconnected" edge          | 6.46:1 on surface             |
| `--color-danger`            | `#9B1C1C` | Errors, destructive confirmation  | 8.15:1 on surface             |
| `--color-focus`             | `#0B3C5D` | Focus ring                        | 11.55:1 on surface            |

Every pair above meets or exceeds 4.5:1, the WCAG 2.2 AA threshold for normal-size text, and therefore also the 3:1 threshold for user-interface components and graphical objects.[1][2] **This is a measurement of the palette, not a conformance claim for a product that does not exist.**

No palette entry is reserved for "good" or "bad" people. The three state colors describe an **edge state in the synthetic demo**, never a person, and never appear on a member's row or avatar.

### Typography

| Token                                                    | Value           | Use                                                                          |
| -------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------- |
| `--font-sans`                                            | system UI stack | All text; no webfont download for a demo                                     |
| `--text-xs`                                              | 0.75rem / 1.4   | Legal-ish disclosure, timestamps (never the only place a disclosure appears) |
| `--text-sm`                                              | 0.875rem / 1.5  | Secondary text                                                               |
| `--text-base`                                            | 1rem / 1.6      | Body default                                                                 |
| `--text-lg`                                              | 1.25rem / 1.4   | Card titles                                                                  |
| `--text-xl`                                              | 1.5rem / 1.3    | Screen titles                                                                |
| `--text-2xl`                                             | 2rem / 1.2      | Single hero number (for example the pot)                                     |
| `--weight-regular` / `--weight-medium` / `--weight-bold` | 400 / 500 / 700 | Emphasis without color-only meaning                                          |

Rules: text sizes are `rem`-based so browser zoom and user font-size settings work; no text smaller than `--text-xs`; important disclosures (sandbox demo, forfeit proposal, "not a payment") are never below `--text-sm`; line length capped at ~70 characters.

### Spacing, radius, elevation, motion

| Token                               | Value                                               |
| ----------------------------------- | --------------------------------------------------- |
| `--space-1 … --space-8`             | 4, 8, 12, 16, 24, 32, 48, 64 px                     |
| `--radius-sm / md / lg / pill`      | 4 / 8 / 16 / 999 px                                 |
| `--shadow-card`                     | single soft shadow; elevation never encodes meaning |
| `--target-min`                      | 44 px minimum interactive target                    |
| `--duration-fast / base`            | 120 ms / 200 ms                                     |
| `--easing-standard`                 | `cubic-bezier(0.2, 0, 0, 1)`                        |
| `--duration-*` under reduced motion | 0 ms (instant state change, no information lost)    |

## Components and states

Every component must define all of: default, hover, focus-visible, active, disabled, loading, error, empty, and permission-denied where applicable. A component shipped without its error and empty states is incomplete.

| Component                                  | Notes and required states                                                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Button (primary / secondary / destructive) | Equal visual weight for Confirm and Cancel in destructive flows — no dimmed Cancel; disabled states always paired with a visible reason |
| Amount input                               | Whole-cents only, inline bound hint (`$1.00–$15.00`), error preserves input, no silent rounding                                         |
| Agreement progress                         | Aggregate "2 of 4 agreed" only; no per-member attribution, no avatars of non-agreers                                                    |
| Member list row                            | First name and neutral state word; no score, badge, streak or ranking                                                                   |
| Plan card                                  | Venue, title, total; no "recommended" badge, no preselection, no ordering claim                                                         |
| Suggestion set                             | Exactly three cards, or the unavailable panel with the fixed-list and defer actions                                                     |
| Approval confirmation                      | Restates plan, venue, total; states "not a payment, not a reservation"; requires explicit activation                                    |
| Balance status chip                        | Five distinct labelled states (blocked, owed, pending, paid, failed); never collapses to a tick or an unverified success                |
| Pause control                              | One action, one confirmation, **no reason field**; neutral confirmation copy                                                            |
| Leave control                              | Two activations maximum; forfeit shown as a pending proposal; Cancel equally prominent                                                  |
| Consent toggle                             | Off by default; on and off presented with equal weight; state announced on change                                                       |
| Graph edge                                 | Color **plus** line pattern (dotted / solid / double) plus state word plus text equivalent                                              |
| Graph text summary                         | Always present; lists every pair and state so the visualization is never the only source                                                |
| Demo banner                                | Persistent "Demo — fictional people" on the graph screen, in the heading, not only fine print                                           |
| Toast / inline message                     | Errors inline and programmatically associated; no auto-dismissing error                                                                 |
| Empty state                                | States what is missing and the next voluntary step; never guilt framing                                                                 |

**Never-build list:** leaderboard, streak counter, closeness score display, drift warning badge on a person, countdown timer on a social action, pre-checked upsell, hidden cancellation, confirm-shaming copy, auto-dismissing error.

## Keyboard and reduced motion

- Every interactive element is reachable by keyboard in DOM order, with a visible `--color-focus` ring of at least 2 px and a 2 px offset; focus is never removed without an equivalent indicator.
- No keyboard trap: overlays close on Escape and restore focus to the invoking control. Destructive confirmations receive focus on open and default to the non-destructive action.
- Controls expose an accessible name and role; icon-only buttons carry a text label. Status and error messages are announced via a live region and associated with their field.
- Two-activation flows (leave, approve) count keyboard and screen-reader activation identically — assistive technology must not need more steps.
- `prefers-reduced-motion: reduce` collapses transitions to instant state changes. The before/after graph scenes stay independently reachable, so no information is conveyed only by animation.
- Zoom to 200% and a narrow viewport must not hide disclosures or clip the confirmation actions.

These are design requirements written against WCAG 2.2 AA.[1][2] They define the YT-029 audit target; no audit has been performed.

## Non-color graph cues

| Edge state  | Color                       | Line pattern | State word    | Text equivalent (example)                              |
| ----------- | --------------------------- | ------------ | ------------- | ------------------------------------------------------ |
| Fading      | `--color-state-fading`      | dotted       | "fading"      | "Sam and Priya last met a long time ago in this demo." |
| Steady      | `--color-state-steady`      | solid        | "steady"      | "Alex and Jo have met recently in this demo."          |
| Reconnected | `--color-state-reconnected` | double       | "reconnected" | "Sam and Priya met at the demo hangout."               |

Requirements: pattern and word are always rendered with the color, never instead of it; the red-to-green demo moment is therefore perceivable without color vision; the text summary carries identical information outside the graphic; no numeric value is shown for any real member anywhere; node labels are first names of **fictional** people only.

## Consent and synthetic demo labelling

- Tracking consent is a standalone affirmative choice, off by default, with on/off given equal visual weight, plus a plain statement of what is collected and that withdrawal removes edges involving the member.
- Withdrawal confirmation states the effect and that peers are not told — and labels own-data access as still being decided (Q-006) instead of promising it.
- The synthetic demo graph carries a persistent heading-level label, the fixture revision, and a one-line notice that the people are fictional and the change is scripted.
- No screen renders real member data through the demo component, and **no UI control switches data sources** — the boundary lives in the server route (ADR 0004).
- Any screen that mentions money states the currency and that this is a sandbox demo with no real funds; any payment-adjacent screen distinguishes approval, payment and reservation in its own words.

## Open items blocking final design

| Item                                              | Blocked by                        |
| ------------------------------------------------- | --------------------------------- |
| Peer-visible pause presentation                   | Q-006                             |
| Forfeit / refund wording and placement            | Q-006, Legal                      |
| Whether any real-user connection view may exist   | Q-002                             |
| Host display when the host is in the flagged pair | Q-002, Behavioral                 |
| Rotation display after pause/leave                | PRD D-P02                         |
| Notification surfaces and copy                    | YT-013 + Behavioral dual approval |

## Sources

[1] https://www.w3.org/TR/WCAG22/ — Web Content Accessibility Guidelines (WCAG) 2.2, W3C Recommendation (contrast minimums 1.4.3, 1.4.11; focus visibility; motion)
[2] https://www.w3.org/WAI/WCAG22/Understanding/ — Understanding WCAG 2.2, W3C Web Accessibility Initiative
