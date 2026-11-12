# Unspoken test plan

**Owner:** QA, Lane R (Rohan). **Tasks:** US-301 to US-305 (issues #41 to #45), with #79 (E2E QA), #80 (demo and fixtures) and #85 (device pass).
**Status:** written for US-301 on November 12, 2026. A status of **pending** means the check has not been run. It is never reported as passed.

## Scope

Under test: the Unspoken HTTP API (`services/api/src/http`, contract `docs/03-architecture/openapi.json`), the domain modules behind it, and the demo path in `docs/07-gtm/DEMO_SCRIPT.md`.

Out of scope, with the reason:

- **Real money.** ADR 0008: the payer pays the venue directly, and the app never moves money.
- **Real bookings.** Every booking is simulated and labelled.
- **Real people or phone numbers.** Fixtures are synthetic only.
- **Live PayPal or app-store calls.** Sandbox only.
- **Visual design QA.** That is US-205 (Vid).
- **Assistive-technology checks.** These go to Accessibility. The device pass (#85) is coordinated here but run by a person with a device.

## Environment and commands

- Node 24 and npm 11, from the repository root. Start from a fresh install with `npm ci`.
- **All local checks:** `make check` (Prettier, Redocly OpenAPI lint, strict typecheck, `node --test tests/*.test.mjs`, secret scan).
- **One suite:** `node --test tests/e2e-happy-path.test.mjs` (and likewise for the other e2e files).
- **Running the API by hand:** `npm run dev:api` serves on 127.0.0.1:3001. It starts with an empty database. See "Demo seed" below.
- **How the e2e tests run.** They call the real Fastify app in-process (`app.inject`) on a fresh in-memory SQLite database loaded from the fixture, with no network. They are named `tests/e2e-*.test.mjs`, so `npm test` and hosted CI pick them up without changing the root `package.json`.

## Fixtures (US-301)

| File                                    | What it holds                                                                                                                                                                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/fixtures/unspoken-demo.json`     | 9 synthetic people and 2 pods. Every name ends in "(demo)". Phones are in the 555-0100 to 555-0199 range reserved for fiction. Includes sandbox PayPal-link and subscription flags and per-person private limits in whole-dollar cents |
| `tests/fixtures/load-unspoken-demo.mjs` | `loadDemoFixture(db)` writes people, permissions, sandbox PayPal links, sandbox subscription receipts, pods and memberships in one transaction. `privateLimitsFor(person)` gives the body for `PUT /me/private-limits`                 |
| `tests/fixtures/nyc-catalog.json`       | The seeded venue and event catalog (Lane A, US-010). See finding F-1                                                                                                                                                                   |

The fixture's roles:

- **Thursday Crew (demo):** Ava, Ben, Cleo and Dev. The happy-path pod.
- **Brunch Club (demo):** Eli, Fay and Gus. The other pod, for cross-pod checks.
- **Hal:** belongs to no pod. Used for outsider checks.
- **Ivy:** belongs to no pod. Used for invite links.
- **Dev:** has no PayPal link, so he cannot say yes.

Fixture rules, all checked by `tests/fixtures-unspoken.test.mjs`:

- visibly synthetic: every name ends in "(demo)", and only fictional phone numbers appear;
- no email address, card-length number or bank term anywhere;
- pods hold 3 to 8 people, and every reference resolves;
- loading is deterministic, passes the integrity and foreign-key checks, and writes no money.

## Test matrix

### Happy path (US-302, #79)

Onboarding to a confirmed split with visible IOU balances. Per ADR 0008, settling up happens outside the app. File: `tests/e2e-happy-path.test.mjs`.

| ID    | Step                                                                   | Status                                                                                             |
| ----- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| HP-1  | Sign in by phone code; session cookie and CSRF token                   | **pass** (`tests/e2e-happy-path.test.mjs`, Nov 12)                                                 |
| HP-2  | Set own private limits; never visible to anyone else                   | **pass** (`tests/e2e-happy-path.test.mjs`, Nov 12)                                                 |
| HP-3  | Create a pod, invite, accept; pod reaches 3 joined                     | **pass** (`tests/e2e-happy-path.test.mjs`, Nov 12)                                                 |
| HP-4  | Start a hangout (needs an active sandbox subscription)                 | **pass** (`tests/e2e-happy-path.test.mjs`, Nov 12)                                                 |
| HP-5  | Activity shortlist posted as a poll; vote with names visible           | **known failure**, blocked by #99 (catalog event ids break poll and hangout reads); runs as `todo` |
| HP-6  | Time poll; vote; winner chosen                                         | **known failure**, blocked by #99 (catalog event ids break poll and hangout reads); runs as `todo` |
| HP-7  | Ready check; yes needs PayPal linked; any number of yeses is enough    | **known failure**, blocked by #99 (catalog event ids break poll and hangout reads); runs as `todo` |
| HP-8  | A yes-member volunteers as payer; payer confirms; booking is simulated | **known failure**, blocked by #99 (catalog event ids break poll and hangout reads); runs as `todo` |
| HP-9  | Payer confirms the split; shares sum exactly to the total              | **known failure**, blocked by #99 (catalog event ids break poll and hangout reads); runs as `todo` |
| HP-10 | Each member sees their IOU balance                                     | **known failure**, blocked by #99; the HTTP read is also pending #83 (`/me/balances` not served)   |

### Failure and negative paths (US-303, #79)

File: `tests/e2e-negative-paths.test.mjs`.

| ID   | Case                                              | Expected                                                            | Status           |
| ---- | ------------------------------------------------- | ------------------------------------------------------------------- | ---------------- |
| N-1  | A member declines (votes no in the ready check)   | Plan continues if anyone said yes; the decliner owes nothing        | pending (US-303) |
| N-2  | A deadline passes (poll, then ready check)        | Poll extends once, then closes; ready check closes on time          | pending (US-303) |
| N-3  | Settlement is attempted                           | `409 payment_gate_blocked` with the closed gate shape (ADR 0008)    | pending (US-303) |
| N-4  | A single-use invite link is reused                | `409 invite_link_used`                                              | pending (US-303) |
| N-5  | An outsider reads or writes a pod                 | `404 not_found`, the same as a missing pod                          | pending (US-303) |
| N-6  | A webhook arrives with a bad or missing signature | `401`, no effect                                                    | pending (US-303) |
| N-7  | No plan fits                                      | `NO_PLAN` with a planner offer, never naming whose limit blocked it | pending (US-303) |
| N-8  | Nobody votes                                      | Extended once, then `NO_PLAN`                                       | pending (US-303) |
| N-9  | Nobody says yes                                   | `NO_PLAN` with a next-best offer                                    | pending (US-303) |
| N-10 | Booking fails                                     | `BOOKING_FAILED` with a next-best offer                             | pending (US-303) |
| N-11 | A member says yes, then leaves                    | Their balance stays until settled                                   | pending (US-303) |

### Regression (US-305, #79)

| ID  | Check                                             | Status                                                                               |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| R-1 | `make check` green on a fresh clone with `npm ci` | pending (#79)                                                                        |
| R-2 | Hosted CI green on `main`                         | pending (US-305)                                                                     |
| R-3 | No unresolved release blocker                     | **blocked:** YT-007 release approval (#86, Shaahid) and the US-204 device pass (#85) |

### Demo (US-304, #80) and device pass (#85)

| ID   | Check                                                 | Status                                                                |
| ---- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| DM-1 | Timed scripted run of the demo path, with its log     | pending (US-304)                                                      |
| DM-2 | Demo database seeded from the fixture                 | **pending:** `infra/seed/` is Alan's path, awaiting his agreement     |
| DM-3 | Screen recording of the demo                          | **pending: needs a human (Rohan)**                                    |
| D-1  | Physical-device screen-reader pass (US-204 remainder) | **pending: needs a device and Vid.** The checklist is prepared in #85 |

## Findings so far

These are filed as board rows for their owners, not fixed by QA.

| ID  | Finding                                                                                                                                                                                                                                                                                           | Owner                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| F-1 | `tests/fixtures/nyc-catalog.json` says it is synthetic, but uses real NYC venue names and street addresses (for example "Brooklyn Bowl, 61 Wythe Ave"). The names are not personal data, but the venues are not visibly synthetic, and a demo could imply a real business is involved             | Alan (US-010), with Rohan for fixtures     |
| F-2 | Private limits live only in the app's in-memory vault (`ConstraintVault` in `http/app.mjs`), so every member's limits are lost when the API restarts                                                                                                                                              | Shaahid (Backend role, US-019), issue #101 |
| F-3 | The balances and PayPal-link routes are not served yet. Over HTTP, the happy path cannot show IOU balances, and a member cannot link PayPal to say yes                                                                                                                                            | Alan, issue #83                            |
| F-4 | There is no seed for the Unspoken schema. `npm run dev:api` starts empty, and only seeded synthetic numbers can sign in, so the demo cannot run by hand                                                                                                                                           | Alan (`infra/seed/`), pending              |
| F-5 | No planner hook or scheduler in the running server: nothing posts the shortlist or time poll, or runs `runPollJobs` / `runBookingJobs`, so a hangout stays in PLANNING over HTTP alone. This blocks an unattended demo (#44). The E2E test calls these steps directly, labelled PLANNER and CLOCK | Shaahid (US-019), issue #100               |
| F-6 | A shortlist option pointing at a seeded catalog event breaks the API. Storing the catalog id makes GET poll and vote answer 500; storing the contract id makes GET hangout answer 500; the catalog id also yields a silent `null` event link. No catalog-backed plan can be booked over HTTP      | Shaahid (US-019), issue #99                |

## How a failure is reported

Each failure gets an entry with: the case ID, the command, the fixture version (`unspoken-demo-v1`), the expected and actual result, the commit, and the owning role. It goes in as a board row tagged with the owner. QA never fixes product code outside `tests/`.
