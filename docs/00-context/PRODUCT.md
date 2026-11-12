# Product context

**Unspoken plans a friend group's hangouts so nobody has to say "I can't afford that."**

Friend groups lose people over money nobody talks about. When the group picks an expensive plan, the person who can't afford it rarely says so — they make an excuse, skip it, and drift away. Unspoken removes the need to say it out loud.

- 3–8 existing friends form a **group**. Minimum three, so no single "no" can be traced to one person.
- Each member has a **personal agent** holding their _private_ constraints: budget, availability, dietary needs, dislikes. Constraints live in that member's own encrypted vault entry and are never shared with the group.
- A **coordinator agent** proposes candidate plans from a fixed venue catalog. It never receives anyone's constraints; its input is group-level only.
- Each personal agent answers **feasible / not feasible, plus a preference score** per candidate — never _why_. A **tally** step combines the answers and reveals only the winning plan.
- Hard constraints are enforced in **plain code**, never by the model: price, availability, dietary needs and travel time. A soft LLM preference read can only change ranking, never turn a reject into an accept.
- Payment is **all-or-nothing**. Each member's share is **authorized** (held) through PayPal Orders with `intent=AUTHORIZE`. Only when every share is held does the system **capture** them. If anyone declines or the deadline passes, every hold is **voided** and nobody is charged.
- The venue is named as the **payee on each member's order**, so money goes from each friend to the venue and the platform never holds funds.
- Progress is shown to the group as a **count** ("3 of 4 in"), never as names. A failure is "didn't come together this time", with no names and no reasons.
- **Demo moment:** four held badges become one capture and a paid venue; then the replay, where one friend declines and every hold is voided with no names shown.
- **Hackathon targets:** Best Use of PayPal + AI, Agentic Commerce, Most Impactful.
- **Timebox:** 3 days. Production-grade structure and quality, demo-sized scope.

## Why this replaced YourTurn

Unspoken supersedes YourTurn (a rotating friendship fund with a drift graph) — see **ADR 0006**. Two structural problems in YourTurn dissolve here rather than needing to be solved: the platform no longer holds pooled funds, so the money-custody question goes away; and nothing infers anything about anyone's friendships, so the relationship-privacy question goes away. The product reasons only about limits a member stated about themselves.

## Requirement status, not an implemented promise

**Verified:** a sandbox order with `intent=AUTHORIZE` naming a **different merchant as payee** is accepted at create time, and PayPal records that payee on readback (orders `8SX33777K0904662Y` and `5JK26843KL530842H`, November 12, 2026). That is the single call which decides whether "the platform never holds funds" is real, and it was not refused.

**Not verified:** that captured funds actually land in the venue's account. Acceptance at create time is not settlement — `PAYEE_ACCOUNT_RESTRICTED` and similar can surface at authorize or capture instead. Authorize, capture, void and refund all still need a payer approval in a browser, which is a human step. The webhook leg needs a public HTTPS listener and is unavailable locally.

The **payment gate stays closed** and the money flow is unapproved until a human records approval. Privacy here is **architectural and policy-based, not cryptographic**: the tally step sees each member's feasible/score answer in memory, so the guarantee rests on a service boundary and a retention rule rather than on mathematics, and repeated rounds can still leak information by inference. Do not describe it as cryptographically private, do not claim a real venue booking, and never let a "paid" state render as "reserved" or "confirmed with the venue". No real users and no real money.
