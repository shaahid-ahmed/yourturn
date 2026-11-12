# Calendar integration

**Task:** US-011 · **Owner:** Vid (backend, reassigned from Lane S) · **Code:** [`services/api/src/calendar.mjs`](../../services/api/src/calendar.mjs) · **Tests:** [`tests/calendar.test.mjs`](../../tests/calendar.test.mjs) · **Contract:** the `calendar` tag in [openapi.json](openapi.json) (`listOwnCalendarAccounts`, `startCalendarConnect`, `disconnectCalendarAccount`, `setPlannerCalendarAccess`, `getOwnCalendar`, `addEventToOwnCalendar`).

## Guarantees

| Spec rule (p.2, P4.4, P10, P12, P18)         | How it holds                                                                                                                                                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Google Calendar connect                      | `startCalendarConnect` returns the authorization URL with scopes exactly `freebusy.read` and `events.write`. `completeCalendarConnect` (the OAuth callback, server-side) checks a signed, member-bound state that expires after 10 minutes |
| Free/busy only                               | The provider port's `freeBusy` returns intervals. Only `start` and `end` are kept, whatever an adapter returns. Titles, attendees and locations are never read or stored (the schema has no column for them)                               |
| Consent per calendar                         | Every calendar starts with `planner_may_read = 0`. `setPlannerCalendarAccess` turns one calendar on or off. The planner reads only switched-on calendars                                                                                   |
| No calendar content visible to other members | `/me` functions act on the caller's own accounts; another member's account returns `404`, like a missing one. `slotsThatFitPod` returns only the candidate slots that fit everyone, never a busy time or who was busy                      |
| No calendar connected                        | `slotsThatFitPod` lists those members in `askPrivately`, so the planner asks them for times in their private chat (spec permissions table)                                                                                                 |
| Event write after booking                    | `blockBookedHangout` writes a booked hangout to the calendar of **each member who said yes** (spec decision 9), once per (hangout, member) via `calendar_write`. Members without a calendar are skipped                                    |
| Own calendar view                            | `getOwnCalendar` merges the caller's own busy blocks (no titles) with their booked hangouts, over at most 62 days                                                                                                                          |
| Add a catalog event                          | `addEventToOwnCalendar` needs a connected calendar (`409 calendar_not_connected`)                                                                                                                                                          |
| A revoked Google grant                       | The account becomes `needs_reconnect`, and the planner treats that member as having no calendar                                                                                                                                            |

## What is real and what is not

The Google Calendar API is a **port** (`CalendarProvider`). The default, `NO_PROVIDER`, refuses to connect. **No Google adapter is written, and no request has been made to Google.** The tests use a fake provider whose busy blocks carry private titles, to prove those never come out. A real adapter needs the OAuth client named in `.env.example` (`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`) and `UNSPOKEN_OAUTH_STATE_KEY`; it implements the same five methods. Apple Calendar and Outlook come after the demo (spec decision 20).

**Who calls what.** `blockBookedHangout` is called by the booking flow (US-012) after `BOOKED`. `slotsThatFitPod` is called by the planner when it builds the time poll. HTTP routes are US-019.
