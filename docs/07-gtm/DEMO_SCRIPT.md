# Demo Script

**Owner:** Demo & Pitch, Lane R (Rohan). **Task:** US-304 (#44), with #80.
**Status:** script written, and the scripted software run is recorded below. **Pending:** the seeded demo database (US-108, #103), a human rehearsal timed by a person, and the screen recording (Rohan). Beats B3 to B7 cannot run as written until #99 is fixed.

## The story in one line

A pod of friends plans a night out with the planner. Votes are visible with names. One friend pays the venue directly, and the app tracks what everyone owes her. **The app never moves money (ADR 0008).**

## Honest labels (say these, and keep them on screen)

- **Every person, phone number and pod is synthetic.** Names end in "(demo)", and phones are in the fictional 555-0100 to 555-0199 range (`tests/fixtures/unspoken-demo.json`).
- **The booking is simulated.** The card carries the label "Simulated booking for a seeded demo venue. No real reservation is made." Never call it a real reservation. The catalog is seeded demo data (see finding F-1 in `tests/TEST_PLAN.md` about its venue names).
- **No money moves in the app.** Ava pays the venue directly, outside the app, and the app records IOU balances. Settling up happens outside the app. The settlement route answers `409 payment_gate_blocked` by design.
- **Sandbox only.** The PayPal link and the $15 subscription are sandbox records, not real accounts or charges.
- **Private limits are private.** Budgets stay behind the lock. The pod never sees whose limit ruled an option out.

## Setup

1. **Seed the demo database.** _Pending:_ `node infra/seed/unspoken.mjs --reset`, Alan's draft in #103, writing US-108. Until it lands, the demo cannot run by hand against `npm run dev:api`.
2. Start the API with `npm run dev:api` (127.0.0.1:3001), and the phone app against it (Alan, #78).
3. **Operator steps.** The running server has no planner hook or scheduler yet (#100). Until it does, an operator triggers "post the shortlist", "post the time poll", "close the poll" and "run the booking job" between beats. In the scripted run below, these steps are labelled PLANNER and CLOCK.
4. Sign-in code for every fixture phone: `000000` (`delivery: simulated_demo`, so no text message is sent).

## Beats (target 2:50 total, under three minutes)

| Beat | Time      | On screen                                                                              | Say                                                                                                    |
| ---- | --------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| —    | 0:00–0:15 | Splash, then the "(demo)" labels                                                       | "Everyone here is synthetic. Nothing you see moves real money or books a real venue."                  |
| B1   | 0:15–0:35 | Ava (demo) signs in; P19 private limits behind the lock                                | "Ava's budget is private. Only she and her planner can see it."                                        |
| B2   | 0:35–0:50 | Home, Thursday Crew (demo); start a hangout                                            | "Her pod wants a night out, so she asks the planner."                                                  |
| B3   | 0:50–1:15 | The planner's shortlist card; Ava, Ben and Cleo vote, and the names show               | "Votes are visible with names. No card says why an option is there or missing."                        |
| B4   | 1:15–1:35 | The time poll closes on a winner                                                       | "The planner only reads free/busy time from calendars."                                                |
| B5   | 1:35–1:55 | Ready check: Dev (demo) can't say yes without PayPal linked; Ava, Ben and Cleo say yes | "Any number of yeses is enough. The people who say yes share the cost."                                |
| B6   | 1:55–2:20 | Ava volunteers to pay and confirms; the **Simulated booking** label shows              | "Ava pays the venue herself. This booking is simulated, and no real reservation is made."              |
| B7   | 2:20–2:45 | The split card, then Ben's money page: what he owes Ava                                | "The app splits it to the cent and tracks what each friend owes. Settling up happens outside the app." |
| —    | 2:45–2:50 | Close                                                                                  | "One planner, one chat, no awkward money talk."                                                        |

## Failure and reset branches

- **A beat fails live.** Say "this is a sandbox demo", switch to the backup recording at the same beat, and carry on.
- **Reset to a clean state.** Stop the API, run `node infra/seed/unspoken.mjs --reset` (pending, #103), and restart `npm run dev:api`.
- **Sign-in refused.** Only seeded fixture phones can sign in. Check the seed ran against the same `UNSPOKEN_DB`.
- **Hangout stuck in PLANNING.** No scheduler is running (#100). Do the operator step for the next beat.
- **Shortlist won't open (500).** This is #99, catalog event IDs. Until it's fixed, use the backup recording for B3 to B7.

## Backup

A screen recording of a full successful run. **Pending: Rohan to record.** It needs #99 and #103 first, plus the app against the local API (#78). Until then there is no backup that shows the real demo path.

## Rehearsal checklist

- [ ] Seed from the fixture (#103), then restart the API
- [ ] Phone app connected to 127.0.0.1:3001 (#78)
- [ ] Each "(demo)" label and the simulated-booking label is visible on screen
- [ ] Ava's private limits are set before B1 (they don't survive an API restart, #101)
- [ ] Operator steps are rehearsed between beats (#100)
- [ ] A spoken run is timed under three minutes by a person
- [ ] The backup recording exists and plays

## Rehearsal record

### Scripted software run (actually run)

`node --test tests/e2e-demo-rehearsal.test.mjs`. Node 24.22.3, `main` at `c76575e`, fixture `unspoken-demo-v1`, run three times on November 12, 2026. The run drives the real HTTP API in-process. **It times the software, not a spoken demo.**

| Beat | Lane A: the demo as written        | Lane B: rehearsal workaround (not the demo), API time over 3 runs |
| ---- | ---------------------------------- | ----------------------------------------------------------------- |
| B1   | pass                               | pass, 2.0–2.1 ms                                                  |
| B2   | pass                               | pass, 8.5–10.3 ms                                                 |
| B3   | **blocked by #99** (poll read 500) | pass, 6.1–6.3 ms                                                  |
| B4   | blocked (cascades from B3)         | pass, 9.4–9.7 ms                                                  |
| B5   | blocked                            | pass, 1.8–1.9 ms                                                  |
| B6   | blocked                            | pass, 20.7–21.1 ms                                                |
| B7   | blocked                            | pass, 3.1–3.2 ms, including `GET /me/balances` over HTTP          |

**Lane B is a workaround, not the demo.** It uses a non-catalog shortlist option and a stub booker so the later beats can be timed. It shows that every beat after the shortlist works over HTTP, and that the demo's software steps take milliseconds, so the spoken script sets the three-minute budget. **It does not show the demo path working.** The demo path needs #99 fixed.

### Human rehearsal and recording

- **Timed spoken run:** pending. It needs the seed (#103), the app against the local API (#78) and #99.
- **Screen recording:** pending, for Rohan.
