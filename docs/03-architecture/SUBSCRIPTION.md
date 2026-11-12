# Subscription: the $15 plan

**Task:** US-003 · **Owner:** Vid (backend, reassigned from Lane S) · **Code:** [`services/api/src/subscription.mjs`](../../services/api/src/subscription.mjs) · **Tests:** [`tests/subscription.test.mjs`](../../tests/subscription.test.mjs) · **Contract:** `SubscriptionState`, `getOwnSubscription`, `submitSubscriptionReceipt`, `restoreSubscription` and the `subscription_required` refusal on `startHangout` in [openapi.json](openapi.json).

## What it does

| Spec need (P3, P20)                    | Implementation                                                                                                                                                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| $15 a month                            | Only a receipt for product `app.unspoken.plan.monthly` at 1500 cents USD is accepted. `subscription_receipt.price_cents` is constrained to 1500                                                                |
| Receipt validation                     | `submitSubscriptionReceipt` verifies through a `ReceiptVerifier` port. Anything else is `422 receipt_invalid` and writes nothing                                                                               |
| Sandbox only                           | The verifier refuses any receipt whose environment is not `sandbox`, and the table only accepts `environment = 'sandbox'`                                                                                      |
| Plan status                            | `getOwnSubscription` derives `none / active / in_grace / expired` from the newest receipt at read time; nothing stores a status                                                                                |
| Restore purchase                       | `restoreSubscription` verifies the store's latest receipt like any other. A lapsed purchase reports `expired` rather than failing                                                                              |
| A plan check gates the planner         | `startHangout` checks membership (`404`), then the caller's plan (`409 subscription_required`), then pod size (`409 pod_too_small`), then creates the hangout. Pods and history stay readable when a plan ends |
| Plan money separate from hangout money | Nothing in the module touches the ledger, PayPal or a pod                                                                                                                                                      |

**Retries and sharing.** The same receipt twice is a retry: no new row, the same answer. A receipt, or a store subscription (`original_transaction_ref`), already held by another account is refused, so one purchase cannot unlock several accounts.

## Defaults that stand in for open decisions

| Question           | Default                                                                                  | Where it changes                        |
| ------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------- |
| Q-011.1 Who pays   | Each member holds their own plan; the caller's plan gates `startHangout`                 | `requirePlannerEnabled`, `startHangout` |
| Q-011.2 Free trial | None is modelled                                                                         | `deriveState`                           |
| Grace period       | 3 days after expiry (`GRACE_MS`), a proposal. Apple allows 3/16/28 days, Google up to 30 | `GRACE_MS`                              |
| `revoked`          | In the contract enum but never produced: there is no refund/revocation notification yet  | needs a store server notification       |

## Verifier: what is real and what is not

The default `sandboxReceiptVerifier` checks a receipt signed with HMAC-SHA256, using a key from ignored local configuration (`UNSPOKEN_SANDBOX_RECEIPT_KEY`, at least 16 bytes). It **stands in for** Apple's signed transaction (JWS) and Google Play's purchase-token check. Neither store is called, and **no real App Store or Play sandbox purchase has been verified**. Wiring a real store is a new `ReceiptVerifier` with the same contract: return the verified fields or throw `receipt_invalid`. `signSandboxReceipt` exists only for tests and the seeded demo.

**No HTTP route exists yet.** The routes are US-019 (Rohan); these are the domain functions they call.
