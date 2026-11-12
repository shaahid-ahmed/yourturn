/**
 * IOU balance tracker for the Unspoken hangout model.
 *
 * When a payer confirms the split (P13), one balance entry is created per
 * yes-member. Members settle through PayPal (P14). Balances are derived from
 * an append-only entry list; no balance total is ever stored as a mutable field.
 *
 * Balance lifecycle per member:
 *   owed → pending (payment initiated) → paid (webhook confirms)
 *                                       → failed → owed (back to owed on failure)
 *
 * The payer's own share is excluded from the owed-to-payer list; they paid
 * the venue directly. The other yes-members each owe the payer their share.
 */
import { assertCents, splitShares } from './money.mjs';

/** @type {ReadonlyArray<string>} */
export const BALANCE_STATES = Object.freeze(['owed', 'pending', 'paid', 'failed']);

/** @type {ReadonlyArray<string>} */
export const BALANCE_ENTRY_KINDS = Object.freeze([
  'balance_created',    // payer confirms split → creates owed balance
  'payment_initiated',  // member opens PayPal → marks pending
  'payment_captured',   // webhook confirms payment → marks paid
  'payment_failed',     // payment fails → back to owed
]);

/**
 * @typedef {object} BalanceEntry
 * @property {string} entryId
 * @property {string} hangoutId
 * @property {string} kind   one of BALANCE_ENTRY_KINDS
 * @property {string} memberId  the member who owes
 * @property {string} payerId   the member who paid the venue
 * @property {number} amountCents  positive; always the full share amount
 * @property {string | null} idempotencyKey  for payment_initiated
 * @property {string | null} providerEventId  for payment_captured / payment_failed
 * @property {string} occurredAt
 */

/**
 * @typedef {object} MemberBalance
 * @property {string} memberId
 * @property {string} payerId
 * @property {string} hangoutId
 * @property {number} amountCents
 * @property {'owed'|'pending'|'paid'|'failed'} state
 */

export class IouLedger {
  /** @type {BalanceEntry[]} */
  #entries = [];
  #seq = 0;
  /** @type {Set<string>} prevents duplicate payment_initiated for same key */
  #idempotencyKeys = new Set();
  /** @type {Set<string>} prevents duplicate provider events */
  #providerEvents = new Set();

  /**
   * Create one balance per yes-member when the payer confirms the split.
   * The payer themselves is excluded — they paid the venue, not each other.
   *
   * @param {{ hangoutId: string, payerId: string, yesMemberIds: readonly string[], totalCents: number }} input
   * @returns {BalanceEntry[]} one entry per member who owes
   */
  createBalances({ hangoutId, payerId, yesMemberIds, totalCents }) {
    if (!hangoutId) throw new TypeError('createBalances needs a hangoutId');
    if (!payerId) throw new TypeError('createBalances needs a payerId');
    if (!Array.isArray(yesMemberIds) || yesMemberIds.length === 0) {
      throw new RangeError('createBalances needs at least one yes-member');
    }
    assertCents(totalCents);
    if (totalCents <= 0) throw new RangeError('totalCents must be positive');

    // Payer does not owe themselves.
    const debtors = yesMemberIds.filter((id) => id !== payerId);
    if (debtors.length === 0) {
      // All yes-members are the payer (solo hangout edge case — no balances needed).
      return [];
    }

    // Existing balance_created entries for this hangout are idempotent — refuse
    // a second split for the same hangout to avoid creating duplicate debt.
    const alreadyCreated = this.#entries.some(
      (e) => e.hangoutId === hangoutId && e.kind === 'balance_created',
    );
    if (alreadyCreated) {
      throw new RangeError(
        `balances for hangout ${hangoutId} were already created`,
      );
    }

    const shares = splitShares(totalCents, yesMemberIds, hangoutId);
    const debtorShares = shares.filter((s) => s.memberId !== payerId);

    return debtorShares.map(({ memberId, shareCents }) => {
      this.#seq += 1;
      /** @type {BalanceEntry} */
      const entry = Object.freeze({
        entryId: `iou-${this.#seq}`,
        hangoutId,
        kind: 'balance_created',
        memberId,
        payerId,
        amountCents: shareCents,
        idempotencyKey: null,
        providerEventId: null,
        occurredAt: new Date().toISOString(),
      });
      this.#entries.push(entry);
      return entry;
    });
  }

  /**
   * Record that a member has opened PayPal to pay their share.
   * Returns the entry if accepted, throws if the balance is already pending/paid.
   *
   * @param {{ hangoutId: string, memberId: string, idempotencyKey: string }} input
   * @returns {BalanceEntry}
   */
  initiatePayment({ hangoutId, memberId, idempotencyKey }) {
    if (!hangoutId) throw new TypeError('initiatePayment needs a hangoutId');
    if (!memberId) throw new TypeError('initiatePayment needs a memberId');
    if (!idempotencyKey) throw new TypeError('initiatePayment needs an idempotencyKey');

    // Idempotent: same key returns without an error or duplicate entry.
    if (this.#idempotencyKeys.has(idempotencyKey)) {
      const existing = this.#entries.find(
        (e) => e.idempotencyKey === idempotencyKey,
      );
      if (existing) return existing;
    }

    const balance = this.#deriveBalance(hangoutId, memberId);
    if (!balance) {
      throw new RangeError(
        `no balance for member ${memberId} in hangout ${hangoutId}`,
      );
    }
    if (balance.state === 'pending') {
      throw new RangeError(
        `payment for ${memberId} in ${hangoutId} is already pending`,
      );
    }
    if (balance.state === 'paid') {
      throw new RangeError(
        `payment for ${memberId} in ${hangoutId} is already paid`,
      );
    }

    this.#idempotencyKeys.add(idempotencyKey);
    this.#seq += 1;
    const entry = Object.freeze({
      entryId: `iou-${this.#seq}`,
      hangoutId,
      kind: 'payment_initiated',
      memberId,
      payerId: balance.payerId,
      amountCents: balance.amountCents,
      idempotencyKey,
      providerEventId: null,
      occurredAt: new Date().toISOString(),
    });
    this.#entries.push(entry);
    return entry;
  }

  /**
   * Record that the provider confirmed the payment (called from the verified webhook).
   *
   * @param {{ hangoutId: string, memberId: string, providerEventId: string, amountCents: number }} input
   * @returns {BalanceEntry}
   */
  capturePayment({ hangoutId, memberId, providerEventId, amountCents }) {
    if (!hangoutId) throw new TypeError('capturePayment needs a hangoutId');
    if (!memberId) throw new TypeError('capturePayment needs a memberId');
    if (!providerEventId) throw new TypeError('capturePayment needs a providerEventId');
    assertCents(amountCents);
    if (amountCents <= 0) throw new RangeError('captured amountCents must be positive');

    // Provider event idempotency: delivering the same event twice is safe.
    const eventKey = `captured::${providerEventId}`;
    if (this.#providerEvents.has(eventKey)) {
      return /** @type {BalanceEntry} */ (
        this.#entries.find(
          (e) => e.providerEventId === providerEventId && e.kind === 'payment_captured',
        )
      );
    }

    const balance = this.#deriveBalance(hangoutId, memberId);
    if (!balance) {
      throw new RangeError(
        `no balance for member ${memberId} in hangout ${hangoutId}`,
      );
    }
    if (balance.state !== 'pending') {
      throw new RangeError(
        `cannot capture payment for ${memberId} in state ${balance.state}`,
      );
    }
    if (amountCents !== balance.amountCents) {
      throw new RangeError(
        `captured amount ${amountCents} does not match owed amount ${balance.amountCents}`,
      );
    }

    this.#providerEvents.add(eventKey);
    this.#seq += 1;
    const entry = Object.freeze({
      entryId: `iou-${this.#seq}`,
      hangoutId,
      kind: 'payment_captured',
      memberId,
      payerId: balance.payerId,
      amountCents,
      idempotencyKey: null,
      providerEventId,
      occurredAt: new Date().toISOString(),
    });
    this.#entries.push(entry);
    return entry;
  }

  /**
   * Record that a PayPal payment failed; the balance returns to owed.
   *
   * @param {{ hangoutId: string, memberId: string, providerEventId: string }} input
   * @returns {BalanceEntry}
   */
  failPayment({ hangoutId, memberId, providerEventId }) {
    if (!hangoutId) throw new TypeError('failPayment needs a hangoutId');
    if (!memberId) throw new TypeError('failPayment needs a memberId');
    if (!providerEventId) throw new TypeError('failPayment needs a providerEventId');

    const eventKey = `failed::${providerEventId}`;
    if (this.#providerEvents.has(eventKey)) {
      return /** @type {BalanceEntry} */ (
        this.#entries.find(
          (e) => e.providerEventId === providerEventId && e.kind === 'payment_failed',
        )
      );
    }

    const balance = this.#deriveBalance(hangoutId, memberId);
    if (!balance) {
      throw new RangeError(
        `no balance for member ${memberId} in hangout ${hangoutId}`,
      );
    }
    if (balance.state !== 'pending') {
      throw new RangeError(
        `cannot fail a payment for ${memberId} in state ${balance.state}`,
      );
    }

    this.#providerEvents.add(eventKey);
    this.#seq += 1;
    const entry = Object.freeze({
      entryId: `iou-${this.#seq}`,
      hangoutId,
      kind: 'payment_failed',
      memberId,
      payerId: balance.payerId,
      amountCents: balance.amountCents,
      idempotencyKey: null,
      providerEventId,
      occurredAt: new Date().toISOString(),
    });
    this.#entries.push(entry);
    return entry;
  }

  /**
   * Derive the current balance state for a member in a hangout.
   * Returns null if no balance exists.
   *
   * @param {string} hangoutId
   * @param {string} memberId
   * @returns {MemberBalance | null}
   */
  #deriveBalance(hangoutId, memberId) {
    const relevant = this.#entries.filter(
      (e) => e.hangoutId === hangoutId && e.memberId === memberId,
    );
    if (relevant.length === 0) return null;

    const created = relevant.find((e) => e.kind === 'balance_created');
    if (!created) return null;

    // Walk forward through the events to find the current state.
    let state = /** @type {'owed'|'pending'|'paid'|'failed'} */ ('owed');
    for (const e of relevant) {
      if (e.kind === 'payment_initiated') state = 'pending';
      else if (e.kind === 'payment_captured') state = 'paid';
      else if (e.kind === 'payment_failed') state = 'owed'; // back to owed after failure
    }

    return {
      memberId: created.memberId,
      payerId: created.payerId,
      hangoutId: created.hangoutId,
      amountCents: created.amountCents,
      state,
    };
  }

  /**
   * Return all balances for a hangout.
   *
   * @param {string} hangoutId
   * @returns {MemberBalance[]}
   */
  balances(hangoutId) {
    const memberIds = [
      ...new Set(
        this.#entries
          .filter((e) => e.hangoutId === hangoutId && e.kind === 'balance_created')
          .map((e) => e.memberId),
      ),
    ];
    return memberIds
      .map((id) => this.#deriveBalance(hangoutId, id))
      .filter(/** @param {MemberBalance | null} b */ (b) => b !== null);
  }

  /**
   * Summary view for P15 (money page): what a member owes across hangouts,
   * and what they are owed as the payer.
   *
   * @param {string} memberId
   * @returns {{ totalOwedCents: number, totalOwedToMeCents: number, byHangout: Array<{ hangoutId: string, role: 'debtor'|'payer', amountCents: number, state: string }> }}
   */
  memberSummary(memberId) {
    const hangoutIds = [
      ...new Set(this.#entries.map((e) => e.hangoutId)),
    ];

    /** @type {Array<{ hangoutId: string, role: 'debtor'|'payer', amountCents: number, state: string }>} */
    const byHangout = [];
    let totalOwedCents = 0;
    let totalOwedToMeCents = 0;

    for (const hangoutId of hangoutIds) {
      // As debtor (this member owes someone else)
      const asDebtor = this.#deriveBalance(hangoutId, memberId);
      if (asDebtor) {
        byHangout.push({
          hangoutId,
          role: 'debtor',
          amountCents: asDebtor.amountCents,
          state: asDebtor.state,
        });
        if (asDebtor.state === 'owed' || asDebtor.state === 'pending') {
          totalOwedCents += asDebtor.amountCents;
        }
      }

      // As payer (others owe this member)
      const asPayerEntries = this.#entries.filter(
        (e) =>
          e.hangoutId === hangoutId &&
          e.kind === 'balance_created' &&
          e.payerId === memberId &&
          e.memberId !== memberId,
      );
      for (const entry of asPayerEntries) {
        const balance = this.#deriveBalance(hangoutId, entry.memberId);
        if (balance) {
          byHangout.push({
            hangoutId,
            role: 'payer',
            amountCents: balance.amountCents,
            state: balance.state,
          });
          if (balance.state === 'owed' || balance.state === 'pending') {
            totalOwedToMeCents += balance.amountCents;
          }
        }
      }
    }

    return { totalOwedCents, totalOwedToMeCents, byHangout };
  }

  /**
   * Check whether all balances for a hangout are paid.
   * @param {string} hangoutId
   * @returns {boolean}
   */
  isSettled(hangoutId) {
    const all = this.balances(hangoutId);
    if (all.length === 0) return false;
    return all.every((b) => b.state === 'paid');
  }
}
