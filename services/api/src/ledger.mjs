/**
 * The ledger: append-only, provenance-enforced, and the only place money is recorded.
 *
 * Two rules do most of the work here.
 *
 * An **authorization is not money.** A hold is a promise the payer's funds exist;
 * nothing has moved and nothing may be recorded. Only a capture, a refund or a
 * provider fee is a movement. Recording holds would make the derived sum a
 * fiction, and all-or-nothing settlement depends on that sum being real.
 *
 * **Provenance is a constraint, not a convention.** A non-synthetic entry needs a
 * verified provider event; a correction needs the entry it corrects. Without this,
 * fixture money could pass a budget check that authorizes a real payment.
 */
import { assertCents } from './money.mjs';

/** Movements of money. A hold is deliberately absent. */
export const LEDGER_KINDS = Object.freeze([
  'share_captured',
  'provider_fee',
  'refund',
  'correction',
]);

/**
 * @typedef {object} LedgerEntryInput
 * @property {string} hangoutId
 * @property {string} kind
 * @property {number} amountCents signed
 * @property {string} [providerEventId]
 * @property {string} [correctsEntryId]
 * @property {boolean} [synthetic]
 * @property {string} [occurredAt]
 */

/**
 * @typedef {object} LedgerEntry
 * @property {string} entryId
 * @property {string} hangoutId
 * @property {string} kind
 * @property {number} amountCents
 * @property {string | null} providerEventId
 * @property {string | null} correctsEntryId
 * @property {boolean} synthetic
 * @property {string} occurredAt
 */

export class Ledger {
  /** @type {LedgerEntry[]} */
  #entries = [];
  /** @type {Set<string>} */
  #eventKinds = new Set();
  #sequence = 0;

  /**
   * @param {LedgerEntryInput} input
   * @returns {LedgerEntry} a frozen copy of what was recorded
   */
  append(input) {
    const { hangoutId, kind, amountCents } = input;
    if (!hangoutId) throw new TypeError('a ledger entry must name its hangout');
    if (!LEDGER_KINDS.includes(kind)) {
      throw new TypeError(
        `${kind} is not a ledger kind; a hold moves no money and must not be recorded`,
      );
    }
    assertCents(amountCents);

    const synthetic = input.synthetic === true;
    const providerEventId = input.providerEventId ?? null;
    const correctsEntryId = input.correctsEntryId ?? null;

    if (kind === 'correction') {
      if (!correctsEntryId) {
        throw new TypeError('a correction must name the entry it corrects');
      }
      if (!this.#entries.some((entry) => entry.entryId === correctsEntryId)) {
        throw new RangeError(
          `correction target ${correctsEntryId} does not exist`,
        );
      }
    } else if (correctsEntryId) {
      throw new TypeError('only a correction may name a corrected entry');
    }

    // The provenance rule, mirroring the database CHECK constraint.
    if (!synthetic && kind !== 'correction' && !providerEventId) {
      throw new TypeError(
        'a non-synthetic entry needs a verified provider event; refusing to record unprovenanced money',
      );
    }
    if (synthetic && providerEventId) {
      throw new TypeError('synthetic money must not claim a provider event');
    }

    // One provider event legitimately writes an amount and its fee, so uniqueness
    // is (event, kind) rather than event alone.
    if (providerEventId) {
      const token = `${providerEventId}::${kind}`;
      if (this.#eventKinds.has(token)) {
        throw new RangeError(
          `${kind} for provider event ${providerEventId} is already recorded`,
        );
      }
      this.#eventKinds.add(token);
    }

    this.#sequence += 1;
    /** @type {LedgerEntry} */
    const entry = Object.freeze({
      entryId: `entry-${this.#sequence}`,
      hangoutId,
      kind,
      amountCents,
      providerEventId,
      correctsEntryId,
      synthetic,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    });
    this.#entries.push(entry);
    return entry;
  }

  /**
   * @param {string} hangoutId
   * @returns {LedgerEntry[]} a copy; the ledger itself cannot be mutated by a caller
   */
  entries(hangoutId) {
    return this.#entries
      .filter((entry) => entry.hangoutId === hangoutId)
      .map((entry) => entry);
  }

  /**
   * Three sums, because they authorize different things.
   *
   * `verifiedCents` is the only figure that may gate a real payment.
   * `displayCents` includes fixture money and is for display alone.
   * All three are signed: a refund can legitimately take a hangout negative.
   *
   * @param {string} hangoutId
   */
  sums(hangoutId) {
    const entries = this.entries(hangoutId);
    const total = (/** @type {(e: LedgerEntry) => boolean} */ predicate) =>
      entries
        .filter(predicate)
        .reduce((sum, entry) => sum + entry.amountCents, 0);
    return {
      verifiedCents: total(
        (entry) => !entry.synthetic && entry.providerEventId !== null,
      ),
      syntheticCents: total((entry) => entry.synthetic),
      displayCents: total(() => true),
      entryCount: entries.length,
    };
  }
}
