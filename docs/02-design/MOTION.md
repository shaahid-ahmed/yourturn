# Unspoken motion

**Task:** US-203 · **Owner:** Product Designer (Vid) · **Status:** draft for review. Tokens are in [`apps/web/src/styles/tokens.css`](../../apps/web/src/styles/tokens.css). The screens are in [FLOWS.md](FLOWS.md), and components in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

**Source:** spec p.15, "Motion and visual placeholders". The spec says the backend does not depend on any of this and that final assets come later. This document fixes **what each moment means, how long it takes, and what replaces it under reduced motion**, so Frontend can leave the right slot. Asset art (the logo, line drawings) is still to come from the designer.

## Rules for all motion

1. **Motion never carries information alone.** Every moment below lists its **text equivalent**, which is always on screen whether or not anything moves. A member with motion off, or a screen reader, misses nothing.
2. **Reduced motion is a first-class design, not an absence.** Under `prefers-reduced-motion: reduce`, every `--duration-*` token is `0ms` (enforced by `tests/design-tokens.test.mjs`). Each moment also names its specific reduced-motion equivalent, usually an instant state change or a cross-fade at 0ms.
3. **Ambient motion rests after `--ambient-limit` (5 s).** Bubble drift and the rhythm pulse start on their own, so they stop within 5 seconds of Home appearing or of the last interaction. That meets WCAG 2.2.2 (Pause, Stop, Hide) without adding a control. They resume for another 5 s only when the member returns to Home.
4. **No flashing.** Nothing flashes more than three times a second (WCAG 2.3.1). Nothing pulses faster than one cycle per `--duration-rhythm-pulse` (2.4 s).
5. **No motion on people.** No avatar, name, or member row ever shakes, bounces, pulses or highlights to signal a vote, a debt or a missing answer.
6. **Interruptible.** A tap during any transition finishes it at once. Nothing blocks input for longer than `--duration-bubble-open`.
7. **Transform and opacity only.** Animations use `transform` and `opacity`, never layout properties, so they stay smooth on a mid-range phone.
8. **PayPal blue moves only as line art.** The balance thread and empty-state drawings are the only blue that animates, and only as strokes.

## The moments

Each moment is listed with its spec page, trigger, motion, tokens, text equivalent and reduced-motion equivalent. The five named in US-203's acceptance criteria are marked **★**.

### ★ Logo turn · P1 · spec p.5, p.15

- **Trigger:** every app open, while the session check runs.
- **Motion:** the logo mark rotates a single turn (360°) about its vertical axis, with the wordmark fading in under it. One play, no loop.
- **Tokens:** `--duration-logo-turn` (1100ms), `--easing-standard`.
- **Text equivalent:** the wordmark "Unspoken" is in the DOM from the first frame. If the check takes more than 3 s, "Getting your pods…" appears.
- **Reduced motion:** the logo and wordmark appear static, and the splash moves on as soon as the session check returns. There is no artificial delay to "finish" an animation.
- **Never:** hold the user on the splash so the animation can finish once data is ready.

### ★ Bubble drift · P5 · spec p.6, p.15

- **Trigger:** Home appears.
- **Motion:** each pod bubble drifts slowly along its own small closed path (≤ 12px from its rest point). Paths are out of phase, so the field feels alive rather than synchronised. Bubbles never overlap and never move under the member's thumb mid-tap.
- **Tokens:** `--duration-ambient` (14s per cycle), linear easing, stopping after `--ambient-limit` (5s) and settling to rest over `--duration-slow`.
- **Text equivalent:** none needed, because drift carries no meaning.
- **Reduced motion:** bubbles sit still at their rest points.
- **Recommended variant (spec p.15, "addition"):** bubbles drift toward each other when every member is free. **Not designed for the demo**: it needs calendar watching (spec p.16, "spontaneous mode") and it risks implying availability, which the spec keeps private. If it is built later, it needs a text equivalent on the bubble ("Everyone's free Sat") and Privacy review.

### Bubble birth · P6 → P5 · spec p.7, p.15

- **Trigger:** a pod is created.
- **Motion:** the new bubble scales from 0.6 to 1 with a small overshoot, then P7 opens.
- **Tokens:** `--duration-bubble-birth` (520ms), `--easing-settle`.
- **Text equivalent:** P7 opens with the planner's welcome message naming the pod.
- **Reduced motion:** the bubble is simply present, and P7 opens at once.

### Bubble opens into chat · P5 → P7 · spec p.15

- **Trigger:** tapping a bubble.
- **Motion:** the bubble expands from its own position to fill the screen (a shared-element transition), with its colour fading into `--color-paper` as the chat appears. Back plays it in reverse.
- **Tokens:** `--duration-bubble-open` (360ms), `--easing-enter` (open) and `--easing-exit` (close).
- **Text equivalent:** the P7 top bar names the pod, and focus moves to the screen title.
- **Reduced motion:** an instant switch to P7, with focus moved the same way.

### Rhythm pulse · P5, P8 · spec p.15

- **Trigger:** a pod has an agreed meeting rhythm.
- **Motion:** the bubble's outline breathes, with its scale going 1 → 1.03 → 1 once per `--duration-rhythm-pulse`. Pods without a rhythm stay still. The pulse never speeds up as a date approaches; it is not a countdown.
- **Tokens:** `--duration-rhythm-pulse` (2400ms), ease-in-out, inside the `--ambient-limit` window.
- **Text equivalent:** P8 states the rhythm ("Every two weeks"), and the P7 strip states the next date.
- **Reduced motion:** no pulse. The bubble shows its stage cue only.

### ★ Card arrival · P7 (P9–P13 cards) · spec p.15

- **Trigger:** the planner posts a card, or any message arrives, while the chat is open.
- **Motion:** the card rises 12px and fades from 0 to 1. If the member has scrolled up, nothing moves under them; instead a "New card from the planner" pill appears at the bottom.
- **Tokens:** `--duration-card-arrival` (280ms), `--easing-enter`.
- **Text equivalent:** the card is announced in the polite live region, for example "Planner posted: Ideas for Fri 14 Nov, 4 options".
- **Reduced motion:** the card appears in place at full opacity, with the same announcement.

### Votes settle onto the winner · P9, P10 · spec p.15

- **Trigger:** a poll closes.
- **Motion:** the losing options fade to 40% opacity and collapse, and the winning option moves up into the card's result slot. Voter names travel with their option.
- **Tokens:** `--duration-vote-settle` (320ms), `--easing-standard`.
- **Text equivalent:** the card header changes to "Closed · Picked: Ramen at Ivan". The final voter names remain listed. The live region announces "Poll closed. Picked: Ramen at Ivan."
- **Reduced motion:** the card re-renders in its closed state at once.
- **Never:** animate who voted for the losing option (no names flying away).

### ★ Booking pop · P12 (and the P5 bubble) · spec p.15

- **Trigger:** the booking status changes to Booked.
- **Motion:** the status chip scales 1 → 1.08 → 1 with `--easing-settle`, and the chip changes from "Booking…" to "Booked · Simulated booking". On Home, the pod's bubble gives one matching settle.
- **Tokens:** `--duration-booking-pop` (420ms), `--easing-settle`.
- **Text equivalent:** the chip's word ("Booked") plus the notice label "Simulated booking". The live region announces "Booked (simulated) for 4 people, Fri 14 Nov, 7:00 pm."
- **Reduced motion:** the chip and bubble change state instantly, with the same text.
- **Never:** confetti, sound, or a celebration that implies a real reservation. The demo booking is simulated.

### ★ Balance thread · P13–P15 · spec p.15

- **Trigger:** the payer confirms the split (draw), and each balance clears (fade).
- **Motion:** a thin `--color-paypal-line` stroke (`--stroke-thread`, 2px) draws from the payer's avatar to each yes-member's split line, one after another 60ms apart. When a balance becomes Paid, its thread fades out. When all are paid, nothing remains.
- **Tokens:** `--duration-thread-draw` (700ms) and `--duration-thread-fade` (900ms), `--easing-standard`.
- **Text equivalent:** each split line reads "Theo owes Maya $23.34" with its status chip in words. Threads are decorative (`aria-hidden`).
- **Reduced motion:** threads are drawn statically for open balances and removed instantly when paid.
- **Never:** turn a thread red or animate it when a payment fails. A failure is a status chip and a private message, not a visual alarm on a person.

### Empty-state line drawings · P5, P15, P16 · spec p.15

- **Trigger:** an empty state appears.
- **Motion:** optional. The stroke draws on once (`stroke-dashoffset`) over `--duration-slow`.
- **Text equivalent:** the empty-state sentence.
- **Reduced motion:** the drawing is static.

## Reference implementation

This is a sketch for Frontend, not shipped CSS. Durations come from the tokens, so reduced motion is honoured without extra media queries.

```css
.card-arrive {
  animation: card-arrive var(--duration-card-arrival) var(--easing-enter) both;
}
@keyframes card-arrive {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

.chip-booked {
  animation: pop var(--duration-booking-pop) var(--easing-settle);
}
@keyframes pop {
  50% {
    transform: scale(1.08);
  }
}

/* Ambient drift: JS removes .drifting after --ambient-limit (5s). */
.bubble.drifting {
  animation: drift var(--duration-ambient) linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .bubble.drifting {
    animation: none;
  }
}
```

A `0ms` animation still applies its end state, so state is never lost. The reduced-motion rule for `.drifting` exists because an infinite loop at 0ms would otherwise run every frame.

## Open

| Item                                            | Owner / blocker                    |
| ----------------------------------------------- | ---------------------------------- |
| Logo and line-drawing assets                    | Designer (spec: "assets to come")  |
| "Drift toward each other when all free" variant | Not for the demo; Privacy review   |
| Haptics on booking pop and vote                 | Not in spec; propose under "Later" |

## Sources

[1] The UX spec PDF, p.15 (motion and visual placeholders).
[2] https://www.w3.org/TR/WCAG22/ — 2.2.2 Pause, Stop, Hide; 2.3.1 Three Flashes or Below Threshold; 2.3.3 Animation from Interactions; 4.1.3 Status Messages.
