/**
 * An in-memory stand-in for PayPal, used to drive settlement in tests.
 *
 * It is deliberately strict about order: an authorization cannot be created
 * before the payer approves, and a capture cannot happen without one. Each
 * failure mode the real provider has is reproducible by construction, so the
 * failure paths are tested rather than hoped about.
 */
import { toProviderAmount } from '../money.mjs';

export class FakeProvider {
  /** @type {Map<string, { orderId: string, memberId: string, hangoutId: string, amountCents: number, payee: string, intent: string, status: string }>} */
  orders = new Map();
  /** @type {Map<string, { authorizationId: string, orderId: string, memberId: string, amountCents: number, status: string }>} */
  authorizations = new Map();
  /** @type {Map<string, { captureId: string, authorizationId: string, amountCents: number, status: string }>} */
  captures = new Map();
  /** @type {Map<string, unknown>} */
  #idempotency = new Map();
  captureCalls = 0;
  #sequence = 0;

  /** @param {{ failCaptureFor?: string[], echoWrongAmountFor?: string[], feeBasisPoints?: number }} [options] */
  constructor({
    failCaptureFor = [],
    echoWrongAmountFor = [],
    feeBasisPoints = 200,
  } = {}) {
    this.failCaptureFor = failCaptureFor;
    this.echoWrongAmountFor = echoWrongAmountFor;
    this.feeBasisPoints = feeBasisPoints;
  }

  /** @param {string} prefix */
  #next(prefix) {
    this.#sequence += 1;
    return `${prefix}-${this.#sequence}`;
  }

  /** @param {string} key @param {() => any} work */
  #once(key, work) {
    if (this.#idempotency.has(key)) return this.#idempotency.get(key);
    const result = work();
    this.#idempotency.set(key, result);
    return result;
  }

  /** @param {{ idempotencyKey: string, amountCents: number, payee: string, memberId: string, hangoutId: string }} input */
  createAuthorizeOrder(input) {
    return this.#once(`order::${input.idempotencyKey}`, () => {
      const orderId = this.#next('ORDER');
      this.orders.set(orderId, {
        orderId,
        memberId: input.memberId,
        hangoutId: input.hangoutId,
        amountCents: input.amountCents,
        payee: input.payee,
        intent: 'AUTHORIZE',
        status: 'PAYER_ACTION_REQUIRED',
      });
      return {
        orderId,
        approvalUrl: `https://sandbox.example/checkout/${orderId}`,
      };
    });
  }

  /** The payer step, which in reality happens in a browser we do not control. */
  /** @param {string} orderId */
  approve(orderId) {
    const order = this.orders.get(orderId);
    if (!order) throw new RangeError(`unknown order ${orderId}`);
    order.status = 'APPROVED';
    const authorizationId = this.#next('AUTH');
    this.authorizations.set(authorizationId, {
      authorizationId,
      orderId,
      memberId: order.memberId,
      amountCents: order.amountCents,
      status: 'CREATED',
    });
    return authorizationId;
  }

  /** @param {string} orderId @returns {{status: string, authorizationId?: string, amount: string}} */
  readOrder(orderId) {
    const order = this.orders.get(orderId);
    if (!order) throw new RangeError(`unknown order ${orderId}`);
    const authorization = [...this.authorizations.values()].find(
      (a) => a.orderId === orderId,
    );
    return {
      status: order.status,
      authorizationId: authorization?.authorizationId,
      amount: toProviderAmount(order.amountCents),
    };
  }

  /** @param {{ idempotencyKey: string, authorizationId: string }} input */
  captureAuthorization(input) {
    return this.#once(`capture::${input.idempotencyKey}`, () => {
      this.captureCalls += 1;
      const authorization = this.authorizations.get(input.authorizationId);
      if (!authorization)
        throw new RangeError(`unknown authorization ${input.authorizationId}`);
      if (authorization.status !== 'CREATED') {
        throw new RangeError(
          `authorization ${input.authorizationId} is ${authorization.status}`,
        );
      }
      if (this.failCaptureFor.includes(authorization.memberId)) {
        throw new Error('INSTRUMENT_DECLINED');
      }
      authorization.status = 'CAPTURED';
      const captureId = this.#next('CAPTURE');
      this.captures.set(captureId, {
        captureId,
        authorizationId: input.authorizationId,
        amountCents: authorization.amountCents,
        status: 'COMPLETED',
      });
      const echoed = this.echoWrongAmountFor.includes(authorization.memberId)
        ? authorization.amountCents + 1
        : authorization.amountCents;
      return {
        captureId,
        status: 'COMPLETED',
        amount: toProviderAmount(echoed),
        feeCents: Math.round(
          (authorization.amountCents * this.feeBasisPoints) / 10000,
        ),
      };
    });
  }

  /** @param {{ idempotencyKey: string, authorizationId: string }} input */
  voidAuthorization(input) {
    return this.#once(`void::${input.idempotencyKey}`, () => {
      const authorization = this.authorizations.get(input.authorizationId);
      if (!authorization)
        throw new RangeError(`unknown authorization ${input.authorizationId}`);
      authorization.status = 'VOIDED';
      return { status: 'VOIDED' };
    });
  }

  /** @param {{ idempotencyKey: string, captureId: string, amountCents: number }} input */
  refundCapture(input) {
    return this.#once(`refund::${input.idempotencyKey}`, () => {
      const capture = this.captures.get(input.captureId);
      if (!capture) throw new RangeError(`unknown capture ${input.captureId}`);
      capture.status = 'REFUNDED';
      return {
        refundId: this.#next('REFUND'),
        status: 'COMPLETED',
        amount: toProviderAmount(input.amountCents),
      };
    });
  }
}
