# Unspoken flows and screens

**Task:** US-202 · **Owner:** Product Designer (Vid) · **Status:** draft for review. Built on the tokens and components in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) (US-201). **No screen is built yet**: this is the specification Frontend (Alan, US-101–US-105) builds against. It is not evidence of a shipped or audited interface.

**Source of truth:** [Unspoken Experience and Pages Spec](source/Unspoken%20Experience%20and%20Pages%20Spec.pdf), with the page numbers P1–P23 taken from its page map (PDF p.4–5). Spec page references are given as "spec p.N". Strings are placeholder intent; the Content Designer owns the final copy ([VOICE_AND_TONE.md](VOICE_AND_TONE.md)). The API contract (US-001) is not written yet, so states here are named by what the member sees, not by error codes.

This replaces the YourTurn flows (S-01 to S-09). None of those screens exist in Unspoken.

## Rules for every screen

1. **States.** Every screen defines **Loading, Empty, Error and Refused**. "Refused" means the server or the phone declined: a permission is denied, the user is not a member, the plan has lapsed, a money action is gated, and so on. Where a state cannot occur, the table says why rather than leaving it out.
2. **Touch.** Every control has a hit area of at least `--target-min` (44px), with `--target-gap` between neighbours. Primary actions sit in the bottom dock, in thumb reach.
3. **No hover-only affordance.** Nothing is revealed only on hover, and no action exists only behind long-press or swipe. If a gesture is a shortcut, a visible control does the same thing.
4. **Private versus pod.** Private content (limits, stretch asks, private reminders) appears only on P4 step 3, P19 and P22, and always under the lock badge. Nothing private renders in P7–P13, and nothing is ever posted to a pod on a member's behalf without their action.
5. **No reasons on the pod side.** When an option is missing or a plan fails, the pod sees what happens next, never whose limit caused it (spec p.8, p.14).
6. **Honest money and booking.** Any "booked" state in the demo carries the notice "Simulated booking". Any money screen carries "Sandbox — no real money" until the payment gate opens. "Paid" never reads as "confirmed with the venue".
7. **Offline.** Chat and cards render from the last sync under an offline banner. Actions that move money are disabled, and the disabled button states the reason (spec p.15).
8. **Screen readers.** New chat messages and cards are announced through a polite live region. A vote or answer change is announced, including the updated list of names. Every icon-only control has a text label.

## Navigation

```text
P1 Splash ─┬─ signed out ─▶ P2 Sign in ─▶ P3 Subscription ─▶ P4 Profile (6 steps) ─▶ P5 Home
           └─ signed in ──────────────────────────────────────────────────────────▶ P5 Home

P5 Home ─┬─ tap bubble ─▶ P7 Pod chat ─┬─ header ─▶ P8 Pod settings
         │                              ├─ cards  ─▶ P9 Shortlist ─▶ P10 Time poll ─▶ P11 Ready check
         │                              │           ─▶ P12 Booking ─▶ P13 Payer and split ─▶ P14 Settle up
         │                              └─ after the date ─▶ P23 After the hangout
         ├─ plus ───────▶ P6 Create a pod ─▶ P7
         └─ hub button ─▶ Hub sheet ─▶ P15 Money · P16 Events ─▶ P17 Event detail · P18 Calendar
                                        P19 Profile · P20 Settings · P21 Payment methods · P22 Private chat
```

- **Hub entry** is a single button at the bottom right of Home, in thumb reach. It opens a bottom sheet listing P15–P22, and it carries a dot when P22 has an unanswered private ask (spec p.6 leaves placement to design). The sheet lists P22 first when that dot is showing.
- **Back** is the top-left control on every screen except P1, P5 and the PayPal hand-off. The system back gesture does the same thing.
- **Cards versus pages.** P9–P13 appear as cards in the P7 stream. Tapping a card opens it as a bottom sheet with the full detail and actions. Closing the sheet returns to the same scroll position in the chat. The card and the sheet always show the same state.
- **Loop back.** If no plan fits or nobody says yes, the planner posts the next option or offers to widen the window or area in P7. This returns to P9 (spec p.3 diagram).

---

## Entry and onboarding (P1–P4)

### P1 Splash · Entry · spec p.5

**Layout.** The centred wordmark on `--color-paper`, with the logo above it. Nothing else.
**Next.** Signed out goes to P2; signed in goes to P5. The pods are preloaded behind the animation.
**Motion.** The logo turn (US-203). Under reduced motion the logo is static and the splash moves on as soon as the session check returns.

| State   | What the member sees                                                                                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | The logo animation **is** the loading state. If the session check takes over 3 s, a small "Getting your pods…" line appears under the logo.                                           |
| Empty   | Not applicable: there is no content to be empty. A signed-in user with no pods goes to the P5 empty state.                                                                            |
| Error   | Session check failed (network): go to P5 rendered from cache with the offline banner. With no cache, go to P2 with "Can't reach Unspoken. Check your connection." and a Retry button. |
| Refused | Session expired or revoked: go to P2 with "Please sign in again." The phone number is prefilled; nothing else is kept.                                                                |

### P2 Sign in · Entry · spec p.5

**Layout.** Heading "Sign in with your phone", a phone field (country code, then number), and a Send code primary button in the dock. After that, a 6-digit code field with autofill from SMS (`autocomplete="one-time-code"`) that also accepts paste, so nothing has to be memorised or retyped (WCAG 3.3.8), a Resend code link and Continue. Terms and Privacy links sit under the button, at `--text-small` with 44px targets.
**Actions.** Request a code, enter it, continue. The sign-in method is provisionally phone plus SMS code (spec p.16 #3).

| State   | What the member sees                                                                                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading | "Sending code…" and the button is disabled with a spinner. While verifying, the code field is read-only with "Checking…".                                                                              |
| Empty   | Fields are empty with labels above them, never placeholder-only labels. Send code is disabled until the number is valid, and the button says why ("Enter your number").                                |
| Error   | Wrong code: "That code didn't match. Try again or resend." The field keeps the digits. Network failure: "Couldn't send a code. Try again."                                                             |
| Refused | Too many attempts: "Too many tries. You can request a new code at 3:40 pm." This shows a time, never a ticking countdown. A number blocked by the provider gets a neutral message plus a support link. |

### P3 Subscription · Entry · spec p.5

**Layout.** Heading "Unspoken is $15 a month". Three lines with icons: the planner, polls and booking, and PayPal splitting. A Start plan primary button in the dock, with Restore purchase as a secondary button beneath it. Under the buttons, a `--text-small` line says the plan is billed by the phone's app store and is separate from hangout money.
**Actions.** Start the plan through app-store billing (sandbox only), or restore a purchase.
**Open.** Who pays the $15 and whether there is a trial (Q-011 #1, #2). The screen shows a per-member plan with no trial copy until those are decided.

| State   | What the member sees                                                                                                                                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading | While the store sheet is open, the screen shows "Waiting for the App Store…". While the receipt is being checked: "Confirming your plan…".                                                                                                             |
| Empty   | Restore finds no purchase: "We didn't find a plan on this account." Start plan stays available.                                                                                                                                                        |
| Error   | Store or receipt check failed: "Your plan didn't start. You weren't charged by Unspoken." Retry. Never show raw store errors.                                                                                                                          |
| Refused | Purchase cancelled by the member: return quietly to the screen with no error tone. Plan lapsed for a returning member: "Your plan has ended. Your pods and history are still here." Continue to P5 read-only, where the planner is paused (spec p.14). |

### P4 Profile creation · Entry · spec p.5–6

**Layout.** A stepper of six short screens, with a progress label "Step 2 of 6" in words as well as a bar. Back and Continue sit in the dock. Every step except Basics has a Skip for now, and every answer is editable later in P19.

1. **Basics.** Name, photo (optional), bio, and the phone number prefilled from sign-in, read-only with a "Change in Settings" note.
2. **Interests.** The interest picker (chips) from the fixed list (Q-011 #16).
3. **Private limits.** Budget per hangout in whole dollars, dietary needs, dislikes, and longest travel time. The **lock badge "Only you and your planner see this"** stays visible for the whole step, on `--color-private-surface`.
4. **Calendar.** Connect Google Calendar, with a note that the planner reads free or busy time only and that members never see your calendar.
5. **PayPal.** Link PayPal. The PayPal blue line drawing is decoration only; the link button is an ink button.
6. **Permissions.** Contacts, notifications and calendar, each with a one-line reason and Allow and Not now at equal weight.

| State   | What the member sees                                                                                                                                                                                                                                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | Saving a step: Continue shows "Saving…". Connecting the calendar or PayPal hands off to the provider and returns with "Checking the link…".                                                                                                               |
| Empty   | Step 2 or 3 left blank: allowed. Continue reads "Skip for now", and the planner works with no limits until some are set.                                                                                                                                  |
| Error   | Invalid budget (not a whole number, or 0): the error appears next to the field and keeps the input. A provider link that fails says "Google Calendar didn't connect. You can try again or do it later in Calendar."                                       |
| Refused | A permission declined in the OS: the step says what still works, for example "You can still build pods with invite links", and moves on. PayPal link declined: "You can chat and vote. You'll need PayPal to say yes to a plan" (spec p.13, recommended). |

---

## Home and pods (P5–P6)

### P5 Home · Home · spec p.6

**Layout.** A field of organic pod bubbles (`--radius-bubble`, `--color-bubble-n`) floating at different positions across the screen. Each bubble shows the pod name, the member count ("5 people") and a stage cue: a word and a glyph for none, planning, poll open, booking pending or payments open. The plus button is centred in the dock (48px). The hub button sits at the bottom right with the private-ask dot.
**Rules.** **No cue ever shows a single member's status.** Bubble size and position never mean "important", "active" or "behind". With more than six pods the field scrolls vertically, and a "List view" toggle in the top bar shows the same pods as a plain list, which is also the screen-reader order.

| State   | What the member sees                                                                                                                                           |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | Bubble outlines with no text, using `--color-hairline` strokes and no shimmer under reduced motion, until the pods arrive.                                     |
| Empty   | One large bubble with a PayPal-blue line drawing: "Start your first pod", which opens P6 (spec p.14).                                                          |
| Error   | Pods failed to load with no cache: "Couldn't load your pods." and Retry. With a cache: show it under the offline banner.                                       |
| Refused | Plan lapsed: bubbles are readable, and a quiet banner says "Your plan has ended. The planner is paused." with a Manage plan link to P20. Signed out: go to P2. |

### P6 Create a pod · Home · spec p.7

**Layout.** Step 1 is the contacts permission explainer, shown only if permission is missing. Step 2 is a searchable contact list with a selected-count line ("You + 3 selected · pods are 3–8 people"); contacts on Unspoken have a select checkbox, and others have an Invite link button. Step 3 is the pod name field and Create pod. Afterwards the new bubble is born on Home and P7 opens.
**Rules.** Create pod is disabled below 3 people (including you), and the reason sits on the button ("Add at least 2 more"). Selecting is blocked at 8, with the count line explaining why.

| State   | What the member sees                                                                                                                                                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | Matching contacts: "Finding friends on Unspoken…" above the list, with rows appearing as they match. Creating: "Creating your pod…".                                                                                                                                        |
| Empty   | No contacts on the app: "None of your contacts are on Unspoken yet. Invite them with a link." Search with no match: "No one called 'Sam'".                                                                                                                                  |
| Error   | Create failed: "Your pod wasn't created. Try again." The selection and name are kept. An invite link that fails to generate gets Retry.                                                                                                                                     |
| Refused | Contacts permission declined: skip the list, show "Create with invite links" with a Share link button. The pod is created now, and the planner waits until 3 people have joined (spec p.7). An invite link already used: "This invite was already used. Ask for a new one." |

---

## Inside a pod (P7–P12, P23)

### P7 Pod chat · Pod · spec p.7

**Layout.**

- **Top bar:** back, the pod name, up to four member avatars plus "+3". Tapping the bar opens P8.
- **Under the bar:** a one-line "Next hangout" strip ("Fri 14 Nov · planning").
- **Message list:** people and the planner, with the planner as a named participant that has its own avatar.
- **Planner cards:** inline cards for P9–P13.
- **Composer:** in the dock.

**Rules.** The pod sees one conversation. Reminders to individuals never appear here (spec p.10, p.14). The planner never posts anyone's limits, stretch answers, or reasons an option was dropped.

| State   | What the member sees                                                                                                                                                                    |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | The last synced messages render at once. Older pages load at the top with a "Loading earlier messages" row.                                                                             |
| Empty   | A new pod: a planner welcome message saying what it does, plus a "Set how often you meet" chip that opens P8 rhythm.                                                                    |
| Error   | A send that fails: the message stays in the list with "Not sent · Retry" in words and an icon. History that fails to load: an inline Retry row.                                         |
| Refused | Not a member (removed, or a stale link): "You're not in this pod." Nothing about the pod is shown. Plan lapsed: messages work, and planner cards show "Planner paused" with no actions. |

### P8 Pod settings · Pod · spec p.8

**Layout.** Sections, in order:

- **Members:** photo and name rows. The creator sees Add and Remove; everyone sees Leave pod.
- **Meeting rhythm:** the current default plus "Propose a change", which posts to the chat.
- **Group activities:** a list, with Add.
- **Mute this pod:** a toggle with an on/off state word.

**Rules.**

- Leaving takes two taps: Leave pod, then Confirm. Cancel has equal weight, and no reason is asked for.
- A member who leaves keeps any open balance until it is settled (spec p.14).
- A member list never shows owed amounts, votes or any status.

| State   | What the member sees                                                                                                                                 |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | Section headings render at once; rows fill in.                                                                                                       |
| Empty   | No rhythm: "No rhythm yet. Propose one in the chat." No group activities: "Add things this pod wants to do. The planner tries these first."          |
| Error   | Save failed: an inline message on the section, with the value kept. A failed leave: "You're still in the pod. Try again." Never a false "You left".  |
| Refused | A non-creator trying Remove: the control is not shown at all. Removing below 3 members: blocked with the reason stated (minimum is open, Q-011 #11). |

### P9 Activity shortlist and vote · Pod · spec p.8

**Layout.** A planner card titled "Ideas for Fri 14 Nov", listing 3–5 options. Each option shows the title, venue or organizer, date and time for events, "About $24 each", tags, and a 48px Vote toggle. **Voter first names are listed under each option** ("Maya, Theo"). Tapping the card opens a sheet with the same list and a closing time.
**Rules.**

- No option carries "budget-friendly", "why this one", "recommended", a rank or a preselection.
- Options are listed in the order the planner returned them, and that order is not a claim.
- You can change your vote before the close. The vote toggle says "Vote" or "Voted ✓" in words.
- Votes are shown with names, as the spec requires (Q-013 records it as a deliberate choice).

| State   | What the member sees                                                                                                                                                                                                                                                                                                                                     |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | Planner typing indicator: "Planner is finding ideas…". On a vote tap, the button shows the pressed state until the server confirms.                                                                                                                                                                                                                      |
| Empty   | No option fits everyone: the planner says "Nothing fit this time. Want me to look further out or in a wider area?" with two buttons. **Never says whose limit.** No votes yet: "No votes yet". Host chose not to use the planner: a "Browse the event catalog" button links to P16; the same budget and payment gates apply (D-P03, `createManualPlan`). |
| Error   | A vote that fails to save: the toggle reverts and "Your vote didn't save. Try again." shows next to it.                                                                                                                                                                                                                                                  |
| Refused | Poll closed: the card is read-only, showing "Closed · Picked: Ramen at Ivan" plus the final names. Plan lapsed: "Planner paused". A member still waiting on a private stretch ask sees the same card as everyone else; the ask lives only in P22.                                                                                                        |

### P10 Time poll · Pod · spec p.8–9

**Layout.** A planner card titled "When works?", listing 2–4 slots ("Fri 14 Nov, 7:00 pm"), each with a Vote toggle and voter names. A closing time is shown as a time ("Closes Thu 9:00 pm"), never as a countdown.
**Rules.** You can change your vote before the close. "Closing soon" reminders go privately, only to members who have not voted, and never as a call-out in the chat (spec p.13). A tie breaks on lower cost, then the earlier start, and the card states the winner in words.

| State   | What the member sees                                                                                                                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | "Planner is checking calendars…" (free or busy only).                                                                                                                                                                                       |
| Empty   | No slot works: "No time worked for everyone. Want me to look at a wider window?" with Yes and Not now. Nobody votes by the close: the planner extends once ("I'll keep this open until Fri 9:00 am"), then closes (spec p.14, recommended). |
| Error   | A vote that fails to save: it reverts with an inline message.                                                                                                                                                                               |
| Refused | Closed: read-only with the winning slot. A member who has no calendar connected still votes manually; the planner asks them for times in P22 (spec p.13).                                                                                   |

### P11 Ready check · Pod · spec p.9

**Layout.** A planner card: the chosen plan and time, and "Are you in?". It lists every member with their answer as a word (In, Out, Not answered). Your own row carries 48px **Yes** and **No** buttons at equal weight. A line reads "Everyone who says yes shares the cost."
**Rules.** Any number of yeses is enough. If only one member says yes, the planner checks with them before going ahead (spec p.17 #17). Your answer can change until booking starts.

| State   | What the member sees                                                                                                                                                                                                                |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | Answer pressed: the button shows the pressed state, then the row updates. The change is announced as "You're in. In: Maya, Theo, you."                                                                                              |
| Empty   | Nobody answered yet: every row reads "Not answered". Nobody says yes: the card closes with "Not this time", and the planner offers the next-best option (spec p.9).                                                                 |
| Error   | An answer that fails to save: it reverts with an inline message.                                                                                                                                                                    |
| Refused | No PayPal linked: **Yes** is disabled with the reason "Link PayPal to say yes" and a link to P21. **No** stays available (spec p.13, recommended). Booking already started: answers are locked with "Locked — booking in progress". |

### P12 Booking confirmation · Pod · spec p.9

**Layout.** A planner card: what will be booked, for how many, when, and the estimated cost ("About $96 total"). A **Confirm booking** button is shown to whoever confirms; everyone else sees "Waiting for Maya to confirm". A status chip shows one of: Waiting for confirmation, Booking, Booked, Couldn't book.
**Rules.**

- The planner books nothing until it gets a confirmation. Reminders to confirm go privately to the confirmer.
- For events, the planner asks for the same confirmation before it contacts an organizer.
- After a booking, the event is blocked on the calendars of the members who said yes (spec p.17 #9).
- In the demo, **every "Booked" carries the notice "Simulated booking"**.

| State   | What the member sees                                                                                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading | Status chip "Booking…" with the confirm button gone, so it cannot be pressed twice.                                                                                                                                |
| Empty   | Not applicable: the card only exists once a plan and a head count exist.                                                                                                                                           |
| Error   | Couldn't book: "Ivan Ramen couldn't take the booking." The planner offers the next-best plan with a button. No blame, and no partial success shown.                                                                |
| Refused | A member who is not the confirmer sees no Confirm button, only the waiting line. Confirmer still undecided (Q-011 #6): designed for the payer, as recommended. Offline: Confirm is disabled with "You're offline". |

### P23 After the hangout · Pod · spec p.10–11

**Layout.** Posted in P7 the day after the hangout as a card with three 48px buttons at equal weight: **Loved it**, **Fine**, **Not for me**. It carries a private marker: "Only your planner sees this". Below it is the next hangout date from the rhythm.
**Rules.** The rating goes only to your own planner. It is never shown to the pod, and nobody else's rating is shown to you. The shared memory page is out of scope ("idea, not in your flow").

| State   | What the member sees                                                                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | The tapped button shows the pressed state, then "Thanks — your planner will use this."                                                                           |
| Empty   | No rhythm set: the next-date line reads "Set a rhythm to plan the next one", linking to P8.                                                                      |
| Error   | Failed to save: "Didn't save. Try again." The other buttons stay available.                                                                                      |
| Refused | You said no to the ready check, so the rating card is not shown to you. Plan lapsed: the rating is still allowed, and the next-date line reads "Planner paused". |

---

## Money (P13–P15)

Every money screen carries the notice label **"Sandbox — no real money"** while the payment gate is closed. Amounts owed show dollars and cents in `tabular-nums`.

### P13 Payer and split · Money · spec p.10

**Layout.** A planner card: the total, "Paid the venue: Maya" (with the PayPal-blue balance thread drawing from the payer to each member), then one split line per **yes-member** (name and share). Nobody who said no appears. The payer sees **Confirm split** in the dock; others see "Waiting for Maya to confirm the split".
**Rules.**

- The split is equal (spec p.17 #18). Leftover cents go to the first shares in random order, so the shares always sum to the total.
- Balances start from the estimate. After the event, the payer can enter the final amount, and every share updates; each member sees "Updated from $24.00 to $23.34".
- How the payer is chosen is open (Q-011 #5). It is designed as a volunteer control, "I'll pay the venue", with a planner suggestion.

| State   | What the member sees                                                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | "Working out the split…" while the shares are being calculated.                                                                                                             |
| Empty   | No payer yet: "Who's paying the venue?" with an "I'll pay" button for members with PayPal linked.                                                                           |
| Error   | Confirm failed: "The split wasn't saved. Nobody owes anything yet." Retry.                                                                                                  |
| Refused | A volunteer without PayPal linked: "I'll pay" is disabled with "Link PayPal first" (spec p.10). Non-payers never see Confirm. Offline: confirm is disabled with the reason. |

### P14 Settle up · Money · spec p.10

**Layout, as someone who owes.** "You owe Maya $23.34 for Ramen at Ivan (Fri 14 Nov)", a status chip, and an ink **Pay with PayPal** button in the dock. The button hands off to PayPal approval and returns to the app.
**Layout, as the payer.** One balance row per person who owes you, each with a status chip (Owed, Pending, Paid, Failed) showing an icon and a word.
**Rules.**

- Reminders are private to each person who still owes and never go into the pod chat (spec p.10).
- A retry never charges twice: the button is replaced by "Pending" as soon as it is tapped.
- Which PayPal product moves money is open (Q-010). The gate is closed.

| State   | What the member sees                                                                                                                                                                         |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | Returning from PayPal: the status chip reads "Pending — waiting for PayPal to confirm", and nothing reads Paid until the verified webhook arrives.                                           |
| Empty   | Nothing owed in either direction: "You're all square." with a line drawing.                                                                                                                  |
| Error   | Payment failed: the chip returns to **Owed**, with "The payment didn't go through. You still owe $23.34. Nothing was taken." and Try again (spec p.14).                                      |
| Refused | Payment gate closed (the demo default): Pay with PayPal is disabled with "Payments are off in this sandbox demo". PayPal not linked: a link to P21. Offline: disabled with "You're offline". |

### P15 Money page · Money · spec p.10

**Layout.** Two totals at the top in `--text-display`: **You owe** and **You're owed**. Below them, a pod filter (chips) and a list of balance rows grouped by hangout and pod. A **Paid history** section is collapsed by default behind a full-width 48px toggle. Tapping a row opens P14.
**Rules.** Only balances you are part of are shown (Q-011 #14, recommended). Totals are plain numbers with no colour judgement. The balance thread drawing fades as balances clear (US-203).

| State   | What the member sees                                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Loading | The totals read "—", and rows are outlined, until the balances arrive.                                                        |
| Empty   | No balances ever: a line drawing and "No money between friends yet. Balances show up after a hangout is booked."              |
| Error   | "Couldn't load balances." Retry. With a cache: show it under the offline banner, stamped with the last-synced time.           |
| Refused | Plan lapsed: balances stay fully visible and payable, because money owed between friends does not depend on the subscription. |

---

## The hub (P16–P22)

### P16 Events search · Hub · spec p.11

**Layout.** A search field at the top. Filter chips sit under it (Date, Price, Category, Neighborhood); each opens a sheet and has a 44px target. Below is a vertical list of event cards (title, venue, date, price, tags). The demo catalog is seeded, and the list header says "Sample NYC events for the demo".

| State   | What the member sees                                                                              |
| ------- | ------------------------------------------------------------------------------------------------- |
| Loading | Outlined cards. Searching shows "Searching…" in the results header.                               |
| Empty   | No results: "Nothing matches. Try fewer filters." with a Clear filters button and a line drawing. |
| Error   | "Couldn't load events." Retry.                                                                    |
| Refused | Plan lapsed: browsing still works, and Suggest to a pod (on P17) is disabled with the reason.     |

### P17 Event detail · Hub · spec p.11

**Layout.** Title, venue or organizer, date and time, price, description, a static map image (decorative, `alt=""`, because the address is written out in text beside it) with an "Open in Maps" link, and tags. In the dock: **Suggest to a pod** (primary), with Save and Add to calendar as secondary buttons.
**Suggest to a pod.** A pod picker sheet, then a confirmation. The event posts to that pod's chat as a suggestion from you, which the planner adds to its next shortlist.

| State   | What the member sees                                                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | Text renders first; the map area is outlined until it loads.                                                                                          |
| Empty   | No pods yet: Suggest opens "Create a pod first" with a link to P6.                                                                                    |
| Error   | Event gone or expired: "This event isn't available anymore." with Back to events. A failed save or suggest shows an inline error and changes nothing. |
| Refused | No calendar connected: Add to calendar opens a connect prompt (P18). Plan lapsed: Suggest is disabled with "Planner paused".                          |

### P18 Calendar · Hub · spec p.11

**Layout.** A Week/Month segmented control (each segment 44px). Your connected calendars' events and Unspoken hangouts are shown together, and hangouts are marked with a pod-colour bar **and** the pod name. Below that is a **Connected calendars** list with a per-calendar "Planner may read free/busy" switch, plus Connect and Disconnect.
**Rules.** The planner reads free or busy only, and members never see each other's calendars (spec p.2). Each switch states what it does in words.

| State   | What the member sees                                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Loading | The grid renders; events fill in.                                                                                             |
| Empty   | Nothing connected: "Connect Google Calendar so the planner can find times that work." Connect. Hangouts still show.           |
| Error   | Sync failed: "Google Calendar didn't sync. Showing what we had." with the last-synced time and Retry.                         |
| Refused | Permission revoked at Google: "Unspoken can't read this calendar anymore." Reconnect. The planner then asks for times in P22. |

### P19 Profile · Hub · spec p.12

**Layout.**

- Photo, name, bio, and the phone number (read-only here; it changes in Settings), followed by Interests (the picker).
- Then a **Private limits** section on `--color-private-surface`: budget in whole dollars, dietary needs, dislikes and travel time.
- The **lock badge "Only you and your planner see this"** stays pinned at the top of that section.

**Rules.** Edits apply from the planner's next run, and the save confirmation says so.

| State   | What the member sees                                                                                                                                 |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | Fields are outlined; private limits load separately with "Unlocking your limits…".                                                                   |
| Empty   | No interests: "Pick a few things you like doing." No limits: "No limits set. The planner treats everything as fine."                                 |
| Error   | Save failed: the error appears inline on that field, and the value is kept.                                                                          |
| Refused | Session expired while editing: "Please sign in again." Unsaved private edits are discarded rather than cached, so limits never sit in a local draft. |

### P20 Settings · Hub · spec p.12

**Layout.** Sections, in order:

- **Notifications:** one switch per type (Polls, Reminders, Private planner asks, Money), each with an on/off state word.
- **Permissions:** the status of Contacts, Calendar and Notifications in words, plus an Open phone settings button.
- **Subscription:** plan status and Manage in App Store.
- **Privacy:** plain text on what the planner sees and what the pod sees.
- **Account:** Log out, and Delete account.

**Rules.** Delete account takes two steps: Delete, then a confirm that names what is removed and that any open balances stay with the people owed. Cancel has equal weight, and there is no retention offer.

| State   | What the member sees                                                                                                                                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | The switches show their last known state; changing one shows the pressed state until it is saved.                                                                                                                                     |
| Empty   | Not applicable: every section always has content.                                                                                                                                                                                     |
| Error   | A switch that fails to save reverts, with an inline message. Delete failed: "Your account wasn't deleted. Try again."                                                                                                                 |
| Refused | An OS permission that can't be changed in-app: the button opens phone settings and explains why. Open balances when deleting: the confirm states that they stay until settled; the delete is not blocked (Q-011 #14 may change this). |

### P21 Payment methods · Hub · spec p.12

**Layout.** A PayPal-blue line drawing (decoration), then the linked PayPal account (an email or masked handle) and its status as a word (Linked, or Not linked). Link and Unlink are ink buttons. A line says "Unspoken never stores bank or card numbers. Banks and cards are managed in PayPal."

| State   | What the member sees                                                                                                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | Returning from PayPal: "Checking the link…".                                                                                                                                                                                |
| Empty   | Not linked: "Link PayPal to pay and be paid in a hangout." Link PayPal.                                                                                                                                                     |
| Error   | Link failed: "PayPal didn't link. Nothing changed." Retry.                                                                                                                                                                  |
| Refused | Unlink while you owe or are owed: allowed, with the warning "You'll need to relink to settle $23.34." Cancel and Unlink have equal weight. PayPal declines the account: PayPal's reason, in plain words, with no raw codes. |

### P22 Private planner chat · Hub · spec p.12–13

**Layout.**

- The header reads "Your planner", with the **lock badge** under the title. The background is `--color-private-surface`. Messages are one-to-one, and the composer sits in the dock.
- **Stretch-ask card:** the option and its cost, "Is a different budget okay for this one time?", and Yes and No at equal weight. It also states when the ask expires ("If you don't answer by Thu 6:00 pm, I'll skip this option. Nobody will be told.").
- **Private reminders:** things waiting on you, such as a confirmation or a payment owed, each linking to the right card.
- **Free-text limits:** what the planner understood appears as editable chips with a Confirm button. **Nothing is saved until you confirm.**

**Rules.** Nothing in this chat is ever written to a pod. A stretch answer applies to one hangout only.

| State   | What the member sees                                                                                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | Last messages from cache, then "Planner is thinking…" after a send.                                                                                                                   |
| Empty   | "This is just between you and your planner. Tell it about limits in your own words, any time."                                                                                        |
| Error   | Failed send: "Not sent · Retry". A chip confirm that fails: "Your limits weren't saved." The chips stay editable.                                                                     |
| Refused | Stretch ask expired: the card goes read-only with "This option was skipped. Nobody was told." Plan lapsed: messages are readable, and the composer is disabled with "Planner paused". |

---

## Cross-screen edge cases (spec p.14–15)

| Situation                     | Where   | Design                                                                                  |
| ----------------------------- | ------- | --------------------------------------------------------------------------------------- |
| No pods yet                   | P5      | One large invite bubble                                                                 |
| No plan fits everyone         | P9, P10 | Offer a wider window or area; never name a limit or a person                            |
| Nobody votes by the close     | P9, P10 | Extend once, then close                                                                 |
| Tied vote                     | P9, P10 | Lower cost, then earlier start; winner stated in words                                  |
| Nobody says yes               | P11     | "Not this time", then the next-best option                                              |
| Only one yes                  | P11     | The planner checks privately with that member before going ahead                        |
| Booking fails                 | P12     | "Couldn't book", then the next-best plan                                                |
| Payer drops out after booking | P13     | Open (Q-011 / spec #19): a "Who's paying now?" prompt to the pod, with no blame wording |
| Member says yes, then leaves  | P8, P14 | Their balance stays until settled; the leave confirm says so                            |
| PayPal payment fails          | P14     | Back to Owed; the member is told privately                                              |
| Subscription ends             | All     | Pods and history readable; planner paused; money still settles                          |
| No connection                 | All     | Offline banner; cached content; money actions disabled with the reason                  |

## Screen-to-story map (LA-09)

Every screen has at least one story behind it. This table is the traceability check: a screen without a story is out of scope; a story without a screen is unbuilt.

| Screens     | Story IDs | What the story covers                                                                         |
| ----------- | --------- | --------------------------------------------------------------------------------------------- |
| P1–P4       | US-101    | Entry and onboarding: splash, sign-in, subscription, six-step profile                         |
| P5–P6       | US-102    | Home and pods: pod bubbles, create a pod, invite links                                        |
| P7–P12, P23 | US-103    | Pod chat and planning: chat, shortlist, time poll, ready check, booking, after-the-hangout    |
| P13–P15     | US-104    | Money screens: payer and split, settle up, money page                                         |
| P16–P22     | US-105    | Hub: events, event detail, calendar, profile, settings, payment methods, private planner chat |

## Handoff

- **Frontend (Alan, US-101–US-105):** build from this file and [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md); import `apps/web/src/styles/tokens.css`.
- **Content Designer:** every quoted string here is intent. Notification copy (spec p.13–14) needs Content and Behavioral approval before anything is sent (US-013, US-107).
- **Motion ([MOTION.md](MOTION.md), US-203):** logo turn, bubble drift, bubble birth, bubble-to-chat, rhythm pulse, card arrival, vote settle, booking pop, balance thread.
- **Accessibility (US-204):** audits these screens once they run.

## Sources

[1] The UX spec PDF above; page references inline.
[2] https://www.w3.org/TR/WCAG22/ — WCAG 2.2 (2.5.8 target size, 1.4.13 content on hover or focus, 4.1.3 status messages).
