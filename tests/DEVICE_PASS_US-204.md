# Device screen-reader pass for US-204

**Issue:** #85, owned by Rohan with Vid. **Audit it completes:** `docs/02-design/ACCESSIBILITY.md` (Vid). The design-stage and app-stage audits are done, and this is the remaining step.
**Status: pending.** It has not been run. It needs a person with a physical iPhone and Android phone. QA prepared this checklist and does not run the pass itself.
**Who runs it:** ideally not the designer (per the audit), so Rohan or another person runs it, with Vid on hand to triage. Findings are filed as board rows with their owners. **No fix work happens in this pass.**

## Setup (about 5 minutes)

1. **Devices:** one iPhone (iOS 17 or later) with **VoiceOver**, and one Android phone (Android 13 or later) with **TalkBack**. Record the model and OS version of each below.
2. **Same Wi-Fi:** the laptop and both phones are on one network. A phone cannot reach `127.0.0.1`.
3. **Start the app on the laptop:** `npm run dev --workspace apps/web -- -H 0.0.0.0` (Next.js). On each phone, open `http://<laptop-LAN-IP>:3000/signin` in Safari or Chrome.
   - The app currently renders its built-in demo data and does not need the API.
   - If it is wired to the API by then (#78), seed first (#103) and start `npm run dev:api` too.
4. **Phone settings:** text size at the system default for the first run. Reduce Motion **on** for iPhone and Remove Animations **on** for Android, for one screen at the end (step F).
5. **Turn the screen reader on.**
   - iPhone: Settings → Accessibility → VoiceOver, or triple-click the side button if the shortcut is set.
   - Android: Settings → Accessibility → TalkBack, or hold both volume keys.

Navigate by swiping right and left (next and previous), double-tap to activate, and use the rotor (iPhone) or reading controls (Android) for headings. Each screen takes about 2 to 3 minutes per device.

## Checklist

Mark each row **pass**, **fail** or **n/a** for each device. For a fail, write what was announced, word for word.

### A. P2 Sign in (`/signin`)

| #   | Check                                                                                 | iPhone VoiceOver | Android TalkBack |
| --- | ------------------------------------------------------------------------------------- | ---------------- | ---------------- |
| A1  | The page title is announced and names the screen (not just "Unspoken")                |                  |                  |
| A2  | The phone field announces a label, not just "text field"                              |                  |                  |
| A3  | The code field accepts paste and the keyboard's one-time-code suggestion (audit A-09) |                  |                  |
| A4  | The Terms and Privacy links are each reachable and named                              |                  |                  |
| A5  | An error (a wrong code) is announced without moving focus away                        |                  |                  |

### B. P5 Home (`/home`)

| #   | Check                                                                                        | iPhone VoiceOver | Android TalkBack |
| --- | -------------------------------------------------------------------------------------------- | ---------------- | ---------------- |
| B1  | The pod bubbles are read in a sensible order, or the List view toggle gives one (audit A-02) |                  |                  |
| B2  | Each pod bubble announces its name, member count and stage, never a single member's status   |                  |                  |
| B3  | The plus button announces "create a pod", or similar                                         |                  |                  |
| B4  | The hub entry opens a sheet; focus moves into it and returns when it closes                  |                  |                  |
| B5  | The private-chat badge is announced in words, not as colour only                             |                  |                  |

### C. P7 Pod chat, votes and ready check (`/pods/pod-1`)

| #   | Check                                                                                                    | iPhone VoiceOver | Android TalkBack |
| --- | -------------------------------------------------------------------------------------------------------- | ---------------- | ---------------- |
| C1  | The planner is announced as its own participant, distinct from members                                   |                  |                  |
| C2  | A shortlist option can be found by heading or rotor; note if it can't (audit A-14, open)                 |                  |                  |
| C3  | "Vote for <option>" announces its pressed state; voting moves it, and pressing again withdraws it (A-13) |                  |                  |
| C4  | Voter names are announced as names, not ids                                                              |                  |                  |
| C5  | Announcements are not noisy when several votes change; note what is read (audit A-10, open)              |                  |                  |
| C6  | Ready check: Yes and No each announce their state; the confirmation is announced                         |                  |                  |
| C7  | The composer is reachable, and the dock never hides the focused control (A-06)                           |                  |                  |

### D. P14 Settle up (`/money/settle`)

| #   | Check                                                                                                   | iPhone VoiceOver | Android TalkBack |
| --- | ------------------------------------------------------------------------------------------------------- | ---------------- | ---------------- |
| D1  | Each balance announces who, for which hangout, the amount in dollars and cents, and its status in words |                  |                  |
| D2  | "Pending" is announced as a word, not as an icon or colour only                                         |                  |                  |
| D3  | Balance chips are not read again on every update (they are no longer live regions, A-16)                |                  |                  |
| D4  | Nothing suggests money moves in the app (ADR 0008); note any wording that implies a real payment        |                  |                  |

### E. P22 Private planner chat (`/hub/planner`)

| #   | Check                                                                                             | iPhone VoiceOver | Android TalkBack |
| --- | ------------------------------------------------------------------------------------------------- | ---------------- | ---------------- |
| E1  | The lock badge is read as "Only you and your planner see this" (A-16, A-18)                       |                  |                  |
| E2  | A budget stretch card announces the option and its cost, and Yes and No each announce their state |                  |                  |
| E3  | Nothing on this screen is announced as visible to the pod                                         |                  |                  |

### F. Across screens

| #   | Check                                                                                 | iPhone VoiceOver | Android TalkBack |
| --- | ------------------------------------------------------------------------------------- | ---------------- | ---------------- |
| F1  | With Reduce Motion or Remove Animations on, the splash and chat do not animate (A-17) |                  |                  |
| F2  | At the largest text size, P7 and P14 stay usable with no clipped or overlapping text  |                  |                  |
| F3  | Rotating to landscape works (orientation is not locked, A-04)                         |                  |                  |

## Record

| Field                        | Value   |
| ---------------------------- | ------- |
| Date and duration            | pending |
| Tester(s)                    | pending |
| iPhone model and iOS version | pending |
| Android model and OS version | pending |
| Commit of `apps/web` tested  | pending |
| Findings filed (board rows)  | pending |

## After the pass

- Each fail becomes a board row: the check ID, the device, what was announced, the expected result, and the owner. Frontend (Alan) owns `apps/web`, and the audit names the owner of each open finding.
- Vid updates the US-204 row and `ACCESSIBILITY.md` with the result. US-305 (final QA, #45) waits on this pass.
