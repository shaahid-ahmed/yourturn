# Unspoken — start here

## 1. What this is

Unspoken is a **phone-first** app where friend groups ("pods") plan hangouts with an AI planner, vote on plans, book with approval, and split the cost through PayPal. A $15 monthly subscription covers the planner; hangout money moves between friends.

This is a **sandbox-only hackathon demo**. The authoritative design input is [`docs/02-design/source/Unspoken Experience and Pages Spec.pdf`](docs/02-design/source/Unspoken%20Experience%20and%20Pages%20Spec.pdf) (18 pages). [ADR 0007](docs/decisions/0007-ux-spec-supersedes-payment-flow.md) records what that spec changes in the backend.

## 2. Read order (mandatory)

1. [agents/RULES.md](agents/RULES.md)
2. Every file in `docs/00-context/`
3. The UX spec PDF — **all 18 pages**, it is the source of truth for every screen
4. `agents/roles/<your-role>.md`
5. [tasks/BOARD.md](tasks/BOARD.md) → the **CURRENT PLAN** section, then your lane's table
6. The documents listed under **Inputs** in your role file

## 3. Who is on the team

| Person      | Lane                                         | Owns                                                                                                                                                                                                                                                   |
| ----------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Shaahid** | Backend, money, infra, release               | `services/api/**`, `docs/03-architecture/**`, `docs/decisions/**`, `docs/05-risk/THREAT_MODEL.md`, `docs/05-risk/COMPLIANCE.md`, `docs/06-ops/**`, `infra/**`, `tests/**` except fixtures, `.github/**`, `packages/shared/**`, `tasks/**`, `README.md` |
| **Alan**    | Mobile app, pods, planning, money screens    | `apps/web/**`, `services/ai/**`, `docs/01-product/**`, `docs/04-behavioral/**`, `docs/07-gtm/**`, `tests/fixtures/**`, `infra/seed/**`                                                                                                                 |
| **Vid**     | Visual design, UI kit, motion, accessibility | `docs/02-design/**`, design tokens, the visual layer of the app shell                                                                                                                                                                                  |
| **Rohan**   | QA, fixtures, demo                           | `tests/e2e/**`, `tests/fixtures/**`, `docs/07-gtm/DEMO_SCRIPT.md`, the recorded demo                                                                                                                                                                   |

Task IDs are `US-xxx`. `∥` means a task can run in parallel once its dependencies clear. Check [agents/ROSTER.md](agents/ROSTER.md) for write boundaries before editing a file you do not own — open a board row instead.

## 4. Claim and hand off

Follow [agents/HANDOFF.md](agents/HANDOFF.md). Set your row to `IN PROGRESS (role, agent-id)` before starting, use a `role/short-task` branch, and leave a handoff note when you stop: **Done / Not done / How to verify / Risks / Next step**.

Four people are working this repo at once, so **never edit another lane's paths**. If you need a change in someone else's file, open a board row and tag them.

## 5. Commands — all from the repository root

Prerequisites: Node 24 and npm 11; Make is optional.

| Action                      | Command                       |
| --------------------------- | ----------------------------- |
| Install locked dependencies | `make install` (or `npm ci`)  |
| Run the local server        | `make dev` (or `npm run dev`) |
| Run all tests               | `make test` (or `npm test`)   |
| Format                      | `npm run format`              |
| Lint/format check           | `make lint`                   |
| Strict typecheck            | `make typecheck`              |
| Seed synthetic fixtures     | `make seed`                   |
| Secret scan                 | `make secrets`                |
| **All local checks**        | `make check`                  |

`make dev` listens on loopback port 3000 by default; `PORT=3001 make dev` selects another. `make seed` writes only synthetic data to ignored `.local/`. **The payment gate is closed** and no command moves real money.

## 6. Global definition of done

- [ ] Acceptance criteria in the task are met
- [ ] Tests are added and pass, and CI is green
- [ ] Affected docs are updated
- [ ] Behavioral checklist passes (if the change touches users, money or notifications)
- [ ] Reviewer approved
- [ ] Handoff note written, and the task is moved to DONE

Local checks do not prove hosted CI, independent approval, sandbox payment, behavioral sign-off or production readiness. Money logic additionally needs 100% branch coverage and an explicit human money-flow approval. Nothing here may be described as a real venue booking.

## 7. Where to ask

Append a question to **Open questions** in `tasks/BOARD.md` and tag the role that owns the answer. Never guess on money, privacy or legal questions. Credentials go only into ignored local configuration — never into chat, git, task notes or a database.

## 8. What is blocked right now

The spec leaves six decisions to the human (Q-011): who pays the $15, whether there is a free trial, **how the payer pays the venue**, **how the payer is chosen**, **who confirms a booking**, **who sees which balances**, and the fixed interest list. Backend code for those paths waits on those answers. Design and contract work do not.
