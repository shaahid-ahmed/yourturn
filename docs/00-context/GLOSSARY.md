# Glossary

| Term             | Meaning and boundary                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Circle           | 3–6 existing friends; never a stranger-matching pool.                                                                               |
| Contribution     | Fixed monthly amount unanimously agreed, default 500 USD cents and at most 1500; sandbox only.                                      |
| Pot              | Conceptual available circle budget derived from ledger entries; not a stored mutable balance or a verified PayPal wallet.           |
| Ledger           | Append-only financial records from verified events; proposed contract awaits Architect and Payments approval.                       |
| Host             | Member whose turn it is to organize; never a cash recipient.                                                                        |
| Turn             | One member's monthly opportunity to host.                                                                                           |
| Cycle            | Rotation in which each member hosts once; pause/leave exceptions need explicit policy.                                              |
| Tie strength     | Internal 0–1 heuristic based on consented interactions; not an objective measure of affection and not a visible personal score.     |
| Drift            | Hypothesis that a pair may benefit from an invitation; not a diagnosis or public warning.                                           |
| Friendship graph | Internal pairwise model; synthetic visualization in demo until privacy/behavioral review resolves real-user visibility.             |
| Copilot          | LLM suggesting exactly three schema-validated plans; no authority to book or spend.                                                 |
| Host approval    | Explicit authorization of a specific plan, venue and amount by the current host; stale approval must not authorize a changed order. |
| Booking          | Venue reservation, distinct from a PayPal Order/capture; demo venues are fixed and availability cannot be invented.                 |
| Subscription     | PayPal recurring contribution arrangement; created/approved/active/payment-received are distinct evidence states.                   |
| Order / capture  | Checkout intention versus completed payment; neither proves a venue reservation.                                                    |
| Webhook          | Provider event requiring signature verification, deduplication and reconciliation before effects.                                   |
| Idempotency key  | Stable identifier for one logical operation and retries; different operations need different keys.                                  |
| Forfeit          | Proposed leave policy retaining remaining share in the circle; disclosed requirement, not a legally approved conclusion.            |
| Pause            | Private hardship accommodation; never disclose the reason to peers.                                                                 |
| Fixture          | Explicitly synthetic test data; never evidence that a sandbox call occurred.                                                        |
| Sandbox          | PayPal testing environment only; no live credentials, real charges or public launch.                                                |
| ADR              | Numbered architecture decision with owner, rationale and actual approval status.                                                    |
| Gate             | Requirement that blocks subsequent work until evidence and approval exist.                                                          |
