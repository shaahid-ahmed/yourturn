# Product context

**YourTurn keeps existing friend groups from drifting apart.** It is a rotating friendship fund with an AI that tracks how close each pair of friends is.

- 3–6 existing friends form a **circle**. There is no matching with strangers.
- Each member contributes a fixed monthly amount through **PayPal Subscriptions** (default $5, max $15).
- Each month a different member is the **host**. Everyone hosts once per cycle.
- The host never receives cash. The pot pays the venue directly through **PayPal Orders/Checkout** when the host approves a plan. Anyone who leaves forfeits their remaining share, and it stays in the pot.
- **AI components:**
  1. **Friendship graph:** each pair of members has a connection strength from 0 to 1, based on how recently they met, how often they attend together, RSVP patterns and check-ins.
  2. **Drift prediction:** flags pairs whose connection is fading.
  3. **Host copilot (repair planning):** an LLM suggests 3 plans that fit the budget, preferences and availability, built to reconnect drifting pairs.
  4. **Agentic booking:** after the host approves a plan, the agent books it and pays with the pot. The demo uses a fixed list of venues.
- **Demo moment:** a red, fading link in the graph turns green after a hangout.
- **Hackathon targets:** Best Use of PayPal + AI, Most Creative, Innovation.
- **Timebox:** 3 days. Production-grade structure and quality, demo-sized scope.

## Requirement status, not an implemented promise

The preceding product brief is preserved as requested. Phase 0 is scaffold-only. The pot-to-venue money flow, forfeit policy and real-user graph visibility are **unverified requirements**, not approved capabilities. See Q-001, Q-002 and Q-004 in tasks/BOARD.md. No real users or real money may enter this demo. Do not claim a validated measure of friendship or a completed booking.
