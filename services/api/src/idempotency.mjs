/**
 * Idempotency that actually protects.
 *
 * Storing a response under `(actor, operation, key)` alone is a trap: the same key
 * reused against a different hangout replays the first hangout's success, so the
 * second request silently does nothing while reporting that it worked. The stored
 * record therefore also binds the target and a digest of the request body, and a
 * mismatch is a conflict rather than a replay.
 */
import { createHash } from 'node:crypto';

/**
 * Canonical JSON: object keys sorted at every depth, so two equivalent bodies
 * produce one digest regardless of key order.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function canonicalize(value) {
  if (value === null || typeof value !== 'object')
    return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const entries = Object.entries(/** @type {Record<string, unknown>} */ (value))
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(',')}}`;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function digest(value) {
  return createHash('sha256').update(canonicalize(value)).digest('hex');
}

/**
 * @typedef {object} IdempotencyRequest
 * @property {string} actor
 * @property {string} operation
 * @property {string} key
 * @property {unknown} target path parameters identifying what is acted upon
 * @property {unknown} body
 */

export class IdempotencyStore {
  /** @type {Map<string, { targetDigest: string, bodyDigest: string, response: unknown }>} */
  #records = new Map();

  /** @param {IdempotencyRequest} request */
  #slot(request) {
    const { actor, operation, key } = request;
    if (!actor || !operation || !key) {
      throw new TypeError(
        'an idempotency record needs an actor, an operation and a key',
      );
    }
    return `${actor}::${operation}::${key}`;
  }

  /**
   * Record the first response for a key.
   *
   * @param {IdempotencyRequest & { response: unknown }} request
   * @returns {unknown} the response, so callers can `return store.remember({...})`
   */
  remember(request) {
    const slot = this.#slot(request);
    if (this.#records.has(slot)) {
      throw new RangeError(`idempotency slot ${slot} is already recorded`);
    }
    this.#records.set(slot, {
      targetDigest: digest(request.target),
      bodyDigest: digest(request.body),
      response: request.response,
    });
    return request.response;
  }

  /**
   * @param {IdempotencyRequest} request
   * @returns {{ status: 'miss' } | { status: 'replay', response: unknown } | { status: 'conflict', reason: string }}
   */
  lookup(request) {
    const record = this.#records.get(this.#slot(request));
    if (!record) return { status: 'miss' };
    if (record.targetDigest !== digest(request.target)) {
      return {
        status: 'conflict',
        reason: 'this key was used against a different target',
      };
    }
    if (record.bodyDigest !== digest(request.body)) {
      return {
        status: 'conflict',
        reason: 'this key was used with a different request body',
      };
    }
    return { status: 'replay', response: record.response };
  }
}
