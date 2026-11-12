/**
 * The provider port.
 *
 * Settlement talks to this, never to PayPal directly, so the money orchestration
 * is testable without a network and without a human approving anything in a
 * browser. The real adapter implements the same five calls.
 *
 * @typedef {object} PaymentProvider
 * @property {(input: { idempotencyKey: string, amountCents: number, payee: string, memberId: string, hangoutId: string }) => { orderId: string, approvalUrl: string }} createAuthorizeOrder
 * @property {(orderId: string) => { status: string, authorizationId?: string, amount?: string }} readOrder
 * @property {(input: { idempotencyKey: string, authorizationId: string }) => { captureId: string, status: string, amount: string, feeCents: number }} captureAuthorization
 * @property {(input: { idempotencyKey: string, authorizationId: string }) => { status: string }} voidAuthorization
 * @property {(input: { idempotencyKey: string, captureId: string, amountCents: number }) => { refundId: string, status: string, amount: string }} refundCapture
 */
export const PROVIDER_CALLS = Object.freeze([
  'createAuthorizeOrder',
  'readOrder',
  'captureAuthorization',
  'voidAuthorization',
  'refundCapture',
]);

/** @param {Partial<PaymentProvider>} candidate */
export function assertProvider(candidate) {
  for (const call of PROVIDER_CALLS) {
    if (
      typeof (/** @type {Record<string, unknown>} */ (candidate)[call]) !==
      'function'
    ) {
      throw new TypeError(`a payment provider must implement ${call}`);
    }
  }
  return candidate;
}
