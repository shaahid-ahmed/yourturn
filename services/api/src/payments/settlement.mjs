/**
 * All-or-nothing settlement.
 *
 * The shape of this module is the product's promise in code: every member's share
 * is held first, nothing is captured until every hold exists, and if anything
 * fails the money goes back. Four rules are load-bearing.
 *
 * 1. **A hold is not money.** Creating an order or an authorization writes no
 *    ledger entry. Only a capture, its fee, or a refund does.
 * 2. **Evidence or nothing.** An authorization is recorded only from a readback or
 *    a signature-verified webhook. A browser landing on the return URL proves
 *    only that a browser landed on the return URL.
 * 3. **The gate decides, not the code path.** Any capture asks the gate first, and
 *    a closed gate is an explicit refusal with no simulated success.
 * 4. **Failure is symmetric.** A capture that fails after others succeeded
 *    refunds them. The hangout ends negative by the fees, which is the honest
 *    number: the provider keeps its fee on a refunded capture.
 */
import { assertCents, assertProviderEcho, splitShares } from '../money.mjs';
import { assertProvider } from './provider.mjs';
import { IdempotencyStore } from '../idempotency.mjs';

// Private state machine for the hold/capture/void lifecycle.
// These states are internal to the Settlement module; they do not appear in the
// shared hangout state machine, which tracks the UX-spec lifecycle (ADR-0007).
const SETTLEMENT_TRANSITIONS = {
  PROPOSED: { openCommitments: 'COMMITTING' },
  COMMITTING: {
    allAuthorized: 'SETTLING',
    declined: 'VOIDING',
    deadlinePassed: 'VOIDING',
  },
  SETTLING: { allCaptured: 'CONFIRMED', captureFailed: 'SETTLEMENT_FAILED' },
  VOIDING: { allVoided: 'NOT_HAPPENING' },
  CONFIRMED: {},
  NOT_HAPPENING: {},
  SETTLEMENT_FAILED: {},
};

/**
 * @param {string} state
 * @param {string} event
 * @returns {string}
 */
function transition(state, event) {
  const allowed = SETTLEMENT_TRANSITIONS[state];
  if (!allowed) throw new RangeError(`${state} is not a settlement state`);
  const next = allowed[event];
  if (!next) {
    const legal = Object.keys(allowed).join(', ') || 'none';
    throw new RangeError(
      `settlement in ${state} cannot ${event}; legal: ${legal}`,
    );
  }
  return next;
}

/**
 * @typedef {object} Commitment
 * @property {string} memberId
 * @property {number} shareCents
 * @property {string} orderId
 * @property {string} approvalUrl
 * @property {string | null} authorizationId
 * @property {string | null} captureId
 * @property {'created' | 'held' | 'captured' | 'voided' | 'refunded' | 'failed'} status
 */

export class Settlement {
  /** @type {Map<string, { state: string, memberIds: string[], totalCents: number, commitments: Map<string, Commitment> }>} */
  #hangouts = new Map();
  #idempotency = new IdempotencyStore();

  /**
   * @param {{ provider: unknown, ledger: { append: Function, sums: Function }, gate: { assertOpen: Function }, venuePayee: string }} input
   */
  constructor({ provider, ledger, gate, venuePayee }) {
    this.provider = /** @type {any} */ (
      assertProvider(/** @type {any} */ (provider))
    );
    this.ledger = ledger;
    this.gate = gate;
    if (!venuePayee)
      throw new TypeError(
        'settlement needs the venue payee; the platform must not be the payee',
      );
    this.venuePayee = venuePayee;
  }

  /** @param {string} hangoutId */
  #require(hangoutId) {
    const hangout = this.#hangouts.get(hangoutId);
    if (!hangout) throw new RangeError(`unknown hangout ${hangoutId}`);
    return hangout;
  }

  /**
   * One order per member for their own share, with the venue as payee.
   * Idempotent: re-opening returns the existing commitments rather than
   * creating a second set of orders.
   *
   * @param {{ hangoutId: string, memberIds: string[], totalCents: number }} input
   */
  openCommitments({ hangoutId, memberIds, totalCents }) {
    assertCents(totalCents);
    const existing = this.#hangouts.get(hangoutId);
    if (existing) {
      return {
        state: existing.state,
        commitments: [...existing.commitments.values()],
      };
    }
    if (memberIds.length < 3) {
      throw new RangeError('a hangout needs at least three members');
    }

    const shares = splitShares(totalCents, memberIds, hangoutId);
    /** @type {Map<string, Commitment>} */
    const commitments = new Map();
    for (const { memberId, shareCents } of shares) {
      const order = this.provider.createAuthorizeOrder({
        idempotencyKey: `${hangoutId}:${memberId}:create-order`,
        amountCents: shareCents,
        payee: this.venuePayee,
        memberId,
        hangoutId,
      });
      commitments.set(memberId, {
        memberId,
        shareCents,
        orderId: order.orderId,
        approvalUrl: order.approvalUrl,
        authorizationId: null,
        captureId: null,
        status: 'created',
      });
    }
    const state = transition('PROPOSED', 'openCommitments');
    this.#hangouts.set(hangoutId, {
      state,
      memberIds: [...memberIds],
      totalCents,
      commitments,
    });
    return { state, commitments: [...commitments.values()] };
  }

  /**
   * @param {string} hangoutId
   * @param {string} memberId
   */
  orderFor(hangoutId, memberId) {
    const commitment = this.#require(hangoutId).commitments.get(memberId);
    if (!commitment)
      throw new RangeError(`${memberId} has no commitment in ${hangoutId}`);
    return commitment;
  }

  /**
   * Record that a member's share is held. Only verified evidence counts.
   *
   * @param {{ hangoutId: string, memberId: string, evidence: 'readback' | 'webhook' }} input
   */
  recordAuthorization({ hangoutId, memberId, evidence }) {
    if (evidence !== 'readback' && evidence !== 'webhook') {
      throw new TypeError(
        'an authorization may only be recorded from a readback or a signature-verified webhook',
      );
    }
    const hangout = this.#require(hangoutId);
    const commitment = this.orderFor(hangoutId, memberId);

    // Already held: a duplicate webhook must be harmless.
    if (commitment.status !== 'created') {
      return { state: hangout.state, alreadyRecorded: true };
    }

    const order = this.provider.readOrder(commitment.orderId);
    if (order.status !== 'APPROVED' || !order.authorizationId) {
      throw new RangeError(
        `order ${commitment.orderId} is ${order.status}, not approved`,
      );
    }
    if (order.amount) assertProviderEcho(commitment.shareCents, order.amount);

    commitment.authorizationId = order.authorizationId;
    commitment.status = 'held';

    const allHeld = [...hangout.commitments.values()].every(
      (c) => c.status === 'held',
    );
    if (allHeld) hangout.state = transition(hangout.state, 'allAuthorized');
    return { state: hangout.state, alreadyRecorded: false };
  }

  /**
   * Counts only. Naming who has committed would tell the group who is holding out,
   * which is the same disclosure this product exists to avoid.
   *
   * @param {string} hangoutId
   */
  progress(hangoutId) {
    const hangout = this.#require(hangoutId);
    const committedCount = [...hangout.commitments.values()].filter(
      (c) => c.status !== 'created',
    ).length;
    return {
      state: hangout.state,
      committedCount,
      memberCount: hangout.memberIds.length,
    };
  }

  /**
   * Capture every share, or undo the ones that worked.
   *
   * @param {string} hangoutId
   */
  settle(hangoutId) {
    const hangout = this.#require(hangoutId);
    if (
      hangout.state === 'CONFIRMED' ||
      hangout.state === 'SETTLEMENT_FAILED'
    ) {
      // Settling twice must not capture twice.
      return this.#outcome(hangoutId, hangout.state);
    }
    const commitments = [...hangout.commitments.values()];
    const held = commitments.filter((c) => c.status === 'held');
    if (held.length !== commitments.length) {
      throw new RangeError(
        `all ${commitments.length === 3 ? 'three' : commitments.length} shares must be held before any capture`,
      );
    }
    this.gate.assertOpen('capture');

    /** @type {Commitment[]} */
    const captured = [];
    for (const commitment of commitments) {
      try {
        const result = this.provider.captureAuthorization({
          idempotencyKey: `${hangoutId}:${commitment.memberId}:capture`,
          authorizationId: /** @type {string} */ (commitment.authorizationId),
        });
        // Check the echo BEFORE recording anything.
        assertProviderEcho(commitment.shareCents, result.amount);
        const providerEventId = result.captureId;
        this.ledger.append({
          hangoutId,
          kind: 'share_captured',
          amountCents: commitment.shareCents,
          providerEventId,
        });
        if (result.feeCents) {
          this.ledger.append({
            hangoutId,
            kind: 'provider_fee',
            amountCents: -assertCents(result.feeCents),
            providerEventId,
          });
        }
        commitment.captureId = providerEventId;
        commitment.status = 'captured';
        captured.push(commitment);
      } catch {
        // One failure makes the whole hangout fail, in both directions.
        commitment.status = 'failed';
        const refundedCount = this.#refundAll(hangoutId, captured);
        hangout.state = transition(hangout.state, 'captureFailed');
        return { ...this.#outcome(hangoutId, hangout.state), refundedCount };
      }
    }
    hangout.state = transition(hangout.state, 'allCaptured');
    return this.#outcome(hangoutId, hangout.state);
  }

  /**
   * @param {string} hangoutId
   * @param {Commitment[]} captured
   */
  #refundAll(hangoutId, captured) {
    let refundedCount = 0;
    for (const commitment of captured) {
      const refund = this.provider.refundCapture({
        idempotencyKey: `${hangoutId}:${commitment.memberId}:refund`,
        captureId: /** @type {string} */ (commitment.captureId),
        amountCents: commitment.shareCents,
      });
      assertProviderEcho(commitment.shareCents, refund.amount);
      this.ledger.append({
        hangoutId,
        kind: 'refund',
        amountCents: -commitment.shareCents,
        providerEventId: refund.refundId,
      });
      commitment.status = 'refunded';
      refundedCount += 1;
    }
    return refundedCount;
  }

  /**
   * Void every hold. Used for a decline and for an expired deadline, which must
   * be indistinguishable from the outside.
   *
   * @param {string} hangoutId
   */
  #voidAll(hangoutId) {
    const hangout = this.#require(hangoutId);
    if (hangout.state !== 'VOIDING') {
      hangout.state = transition(
        hangout.state,
        hangout.state === 'COMMITTING' ? 'declined' : 'deadlinePassed',
      );
    }
    let voidedCount = 0;
    for (const commitment of hangout.commitments.values()) {
      if (commitment.status !== 'held') continue;
      this.provider.voidAuthorization({
        idempotencyKey: `${hangoutId}:${commitment.memberId}:void`,
        authorizationId: /** @type {string} */ (commitment.authorizationId),
      });
      commitment.status = 'voided';
      voidedCount += 1;
    }
    hangout.state = transition(hangout.state, 'allVoided');
    // No names, no reason: "didn't come together this time".
    return { state: hangout.state, voidedCount, venueConfirmed: false };
  }

  /** @param {{ hangoutId: string, memberId: string }} input */
  decline({ hangoutId, memberId }) {
    const hangout = this.#require(hangoutId);
    const commitment = hangout.commitments.get(memberId);
    if (!commitment)
      throw new RangeError(`${memberId} has no commitment in ${hangoutId}`);
    if (hangout.state === 'COMMITTING' || hangout.state === 'SETTLING') {
      hangout.state = 'COMMITTING';
    }
    return this.#voidAll(hangoutId);
  }

  /** @param {string} hangoutId */
  deadlinePassed(hangoutId) {
    return this.#voidAll(hangoutId);
  }

  /**
   * @param {string} hangoutId
   * @param {string} state
   */
  #outcome(hangoutId, state) {
    const sums = this.ledger.sums(hangoutId);
    return {
      state,
      verifiedCents: sums.verifiedCents,
      entryCount: sums.entryCount,
      // Stated explicitly so no caller can read a capture as a booking.
      venueConfirmed: false,
    };
  }
}
