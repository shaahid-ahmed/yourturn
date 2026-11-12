# Compliance

**Status:** US-015 review, November 12, 2026, by Rohan (legal-compliance, claude-opus-us015). **These are scoped questions, not legal advice and not clearance.** No authoritative legal or provider source was consulted for this pass, so every question below stays **unresolved** until Legal checks a dated source or qualified counsel answers. Each unresolved item blocks the payment gate.
**Owner:** Legal & Compliance. Disclaimer text goes to the Tech Writer for the README; Legal reviews the result.

**The flow under review** (ADR 0007, US-001 contract): one member pays the venue outside the app. The app records what each yes-member owes that payer in an append-only IOU ledger. Members settle through PayPal, member to member (`createSettlementPayment`, gated closed on Q-010 / US-006). The $15 subscription goes through app-store billing and is separate from hangout money. **The app never holds funds, and there is no pot.**

## Sandbox-only disclaimer

Proposed text for the Tech Writer (README) and the app's settings screen:

> Unspoken is a sandbox demonstration. No real money moves: PayPal and app-store calls use sandbox accounts only, every booking is simulated, and all people, pods and venues are synthetic. Balances shown are records of what friends agreed to, not a regulated account or a claim on any funds. Nothing here is legal, tax or financial advice.

Legal must review the final wording once placed. The words "simulated" and "sandbox" must stay visible wherever a booking or a payment is shown (`Booking.simulatedLabel` in the contract).

## Pooled funds and money transmission questions

ADR 0007 removed the pooled-pot design, so the earlier pooled-funds questions are **closed by design**, unless decision Q-011.1 ("one member covers the pod's $15") or a later change brings pooling back. In that case they reopen. Q-012 asks the replacement question, and it is open:

| ID  | Question                                                                                                                                                                                                                                            | Status         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| L-1 | Does recording IOUs and initiating member-to-member PayPal payments make the app (or its operator) a money transmitter or payment facilitator in any jurisdiction where the demo runs? The design intends the app never to be in the flow of funds. | **Unresolved** |
| L-2 | Which PayPal product can initiate a payment from one personal account to another on a member's behalf (Q-010), and do its terms permit an app to initiate it?                                                                                       | **Unresolved** |
| L-3 | Does an IOU ledger between friends create any record-keeping, disclosure or consumer-credit obligation (for example a balance "owed" with reminders)?                                                                                               | **Unresolved** |

## PayPal terms and merchant approval questions

| ID  | Question                                                                                                                                                                                                                                                       | Status         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| L-4 | Under the chosen product's terms, is a settlement between friends a personal transfer or a payment for goods and services? This affects fees, buyer protection and disputes, and the app must not misdescribe it.                                              | **Unresolved** |
| L-5 | Does the app's use of PayPal require partner or merchant onboarding, and what review does PayPal require before any live use? Sandbox use alone requires none of this, and proves nothing about live approval.                                                 | **Unresolved** |
| —   | App-store rules: the $15 plan is digital content billed through the store. Hangout money is between people, not digital content. Legal should confirm against the current store guidelines that keeping hangout payments outside in-app purchase is permitted. | **Unresolved** |

## Forfeit, cancellation, refunds and disputes

There is no forfeit or deposit in this design: a member who says no owes nothing, and nothing is held. Open questions:

- **The event doesn't happen** (cancelled, or the payer drops out after booking — spec decision 19, open). What happens to balances already created? The ledger can append reversing adjustments; the policy is undecided.
- **The actual total changes after the event** (`setActualTotal`). How are members told, and can they dispute? There is no dispute flow in the contract.
- **A member disputes a completed PayPal payment** through PayPal. The ledger must follow the provider's outcome. That reconciliation is part of US-006.
- **Deleting an account** is refused while balances are open (accepted assumption in US-001). Legal should confirm this is acceptable under applicable data-deletion rights.

## Gambling-adjacent risk assessment

No element of chance, stake or prize exists: balances are fixed shares of a real cost, split equally with deterministic remainder rules, and no reward depends on an outcome. **No gambling-adjacent risk is identified in the current design.** This is an assessment of the design, not a legal opinion, and it must be redone if any random draw, wager or prize is added.

## Required qualified review and human gate

- L-1 to L-5, the app-store question and the cancellation policy need **qualified counsel**, or at least a dated authoritative source per item, before the payment gate opens. This review cannot supply either.
- The human owner (Rohan) must record the money-flow approval (RULES 24) after those answers. Sandbox success with US-006 is technical evidence only and **never** implies lawful live operation.
- Until then, `createSettlementPayment` returns `payment_gate_blocked`, and nothing here may be described as a real payment service.
