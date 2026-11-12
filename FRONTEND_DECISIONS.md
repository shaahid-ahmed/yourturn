# FRONTEND_DECISIONS.md, HeyPal v2 restyle

Branch: `design/heypal-frontend` (from `origin/main`).
Scope: `apps/web/**` plus this file. No changes to services, tests, tasks,
docs, or contracts. Visual restyle only, no product behavior changes.
Note on lanes: this crosses Vid's visual lane. The owner explicitly ordered
the HeyPal restyle, so this branch proceeds on that instruction.

## Defaults used (brief part 14, no user questions asked)

All open questions use the brief recommended default:

- D-01 Create Account: same phone and code flow, link reads "Create your
  account" (14px, weight 500, 44px tap area).
- D-02 Duplicate pill layers in Figma 5:5: built once.
- D-03 11px ExtraLight link: built at 14px weight 500.
- D-04 Wordmark offset: kept exact (Pal right aligned, Hey starts left).
- D-05 Tokens marked confirm: values from part 3 as given.
- D-06 Surfaces: deep for intro, login, Home, menu, planner; white for the
  rest; the one sky to white gradient only in the pod chat.
- D-07 Bursts: full for main buttons, mini for chips and icons, none for
  destructive or repeated actions. This pass implements press scale only;
  the canvas particle engine is deferred (see D-20).
- D-08 Orange: #FF7D3C.
- D-09 Codes: six digits.
- D-10 Poll privacy: totals plus my own vote (names with votes where the
  pod shows them).
- D-11 Planner chat: reached from the menu and from Profile, not from a pod
  blob.
- D-12 Invite landing: no invite route exists in this repo, so none was
  built. Logged as remaining work.
- D-13 Calendar sync: .ics only, no Google connection.
- D-14 Events map: chips only, no map dependency.
- D-15 PayPal assets: wordmark on splash only, text labels elsewhere.
- D-16 Routes: kept the repo routes (`/money` stays, `/hub/money` not used).
- D-17 Interests: 72 seeds in 12 categories (brief allows 150 to 200; this
  pass ships 72 and the taxonomy file accepts more without code changes).
- D-18 Reference images: all 11 present and studied.
- D-19 Demo people and venues: invented seed people, fictional venues.
- D-20 Orange orbit: only on pods that need Janani (vote, ready check,
  payment). 3 pods.

## Structural decisions

- S-01 One seed file (`src/lib/heypal/seed.ts`) feeds Home, chat header,
  calendar, events, money, payer, planner, and settings subscription price.
  Counts and amounts are derived, never retyped.
- S-02 The v1 `--color-*` token contract that root tests enforce is kept
  byte identical. HeyPal colors are new bare tokens (`--deep`, `--royal`,
  `--sky`, `--pale`, `--mist`, `--white`, `--ink`, `--ink-muted`,
  `--blue-mid`, `--orange`, `--danger`). Saturated blues use `rgb()`
  notation. New durations are zeroed under reduced motion.
- S-03 `globals.css` keeps the lines root tests require (tokens import,
  `--color-accent` alias, reduced motion block, scroll padding).
- S-04 Settings keeps exactly the four Toggle labels the contract tests
  require. Reduce motion is a plain checkbox row, not a Toggle.
- S-05 `money/settle` keeps `PAYMENT_GATE_OPEN = false`,
  `disabled={!PAYMENT_GATE_OPEN}`, no timers, and no self marked paid state.
- S-06 `pods/[podId]` keeps `aria-pressed={voted}`, the Voted/Vote label
  template, `votes.join` never appears on a votes array, 'Not answered',
  and the Simulated booking notice.
- S-07 `home` keeps `function PodBubble` out of the file (it lives in the
  shared shell), keeps single quoted hub hrefs, and keeps a literal
  `<dialog>` for the search overlay.
- S-08 DM Sans loads through `next/font/google` with a system fallback
  stack. If font fetch fails in the sandbox, text still renders.
- S-09 The Dot System ships as CSS in this pass: dotted outlines, goo-free
  pill buttons with press scale, CSS orbit and wobble, dotted avatar and
  motif blocks. The canvas engine, `dotify`, quality tiers, and BurstLayer
  are deferred to a follow up. No `Math.random` in render paths; tilt comes
  from a seeded hash.
- S-10 Chat empty state is unreachable while demo messages exist; it renders
  once the stream is empty. Kept for the first run contract.
- S-11 The interest cloud ships 72 interests with a seeded tilt layout and
  an inline "More like this" follow up omitted; tray, search, category
  chips, min 5 gate, and aria-live count are in.
- S-12 Phone field placeholder uses a 555 number; contacts are seed people
  with 555 range E.164 phones and first names only.

## Phase checklist (brief part 11)

- P1 Splash: HeyPal holds per HOLD_HEYPAL_MS (2600). Done.
- P2 Sign in: dotted phone field, six code rings, same rules. Done.
- P3 Subscribe: deep surface, seed price, same copy. Done.
- P4 Profile setup: six steps, DotProgress, pill cloud curation. Done.
- P5 Home: blue, five pods, New pod slot, add button, tray peek, search,
  menu with home first, caption with needs count. Done.
- P6 Create a pod: compose layout, palette chips, 3 to 8 count. Done.
- P7 Chat: AI chat style, gradient, composer card, suggestion chips. Done.
- P8 Pod details sheet: bottom sheet restyle on the settings route. Done.
  Invite landing: not built (no route in repo).
- P9 Activity shortlist: carousel cards with vote buttons. Done (light).
- P10 Time poll: dotted vote buttons with counts. Done.
- P11 Ready check: member ring list with Not answered states. Done.
- P12 Booking confirm: approval flow with Simulated booking notice. Done.
- P13 Payer split: ledger shares displayed, confirm creates nothing. Done.
- P14 Settle entry: review and confirm with closed gate. Done.
- P15 Money home: pills, Open and Settled tabs, net +$110.00. Done.
- P16 Events search: stacked cards, search, chips. Done.
- P17 Event detail: header card, suggest to pod from seed pods. Done.
- P18 Calendar: Agenda day cards with time columns, Year grid, search,
  filters. Done.
- P19 Profile: Janani, seed budget, picks, limits, subscription row. Done.
- P20 Settings: grouped list, four toggles, reduce motion, subscription
  from PLAN_PRICE_CENTS. Done.
- P21 Payment methods: linked account display, no card numbers. Done.
- P22 Private planner chat: deep surface, seed budget ask with the two
  brief answers. Done.
- P23 After hangout rating: dotted options, planner only. Done.
- P24 Settle up: see P14. Done.

## Remaining and follow ups

- R-01 Canvas dot engine, dotify build, quality tiers, BurstLayer, /dev/dots
  gallery, flood transition, first run tray tip.
- R-02 Full 150 to 200 interest seeds (72 now, file accepts more).
- R-03 Full five scene illustration cascade in the intro (placeholder
  Pay to Hey wordmark now, constants ready in timeline.ts).
- R-04 API layer swap (types, client, mock, http, hooks, realtime) and
  FRONTEND_API_MAP. Screens read the seed module directly for now.
- R-05 Invite link landing (needs a route decision from the team).
- R-06 Handoff screenshots per phase (no screenshots taken this pass).

## Verification

- `npm run check:copy --workspace @yourturn/web`: green.
- `node scripts/consistency.mjs` in apps/web: green.
- Root `make check`: green (see commit message).
- Dev smoke test: home, signin, money, calendar, events render (see log).
