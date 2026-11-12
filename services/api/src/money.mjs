/**
 * Money. Integer cents only, and every boundary conversion is checked both ways.
 *
 * Nothing here knows about a provider. Converting to a decimal string happens at
 * the edge, and the reply is re-parsed and compared before anything is recorded.
 */
import { createHash } from 'node:crypto';

/** Largest amount we will handle, well inside Number.MAX_SAFE_INTEGER. */
const MAX_CENTS = 1_000_000_000;

/**
 * @param {unknown} value
 * @returns {number} the same value, once proven to be whole signed cents
 */
export function assertCents(value) {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    Math.abs(value) > MAX_CENTS
  ) {
    throw new TypeError(
      `money must be integer cents, received ${String(value)}`,
    );
  }
  return value;
}

/**
 * Split a total into per-member shares that sum back to the total exactly.
 *
 * Division rarely comes out even, so somebody pays the extra cent. Which member
 * that is rotates by hangout: derived from the hangout id, so a retry of the same
 * hangout produces identical shares (idempotency depends on it) while no single
 * member ends up subsidising every hangout.
 *
 * @param {number} totalCents
 * @param {readonly string[]} memberIds
 * @param {string} hangoutId
 * @returns {{ memberId: string, shareCents: number }[]}
 */
export function splitShares(totalCents, memberIds, hangoutId) {
  assertCents(totalCents);
  if (memberIds.length === 0)
    throw new RangeError(
      'a hangout needs at least one member to split a total',
    );
  if (totalCents < memberIds.length) {
    throw new RangeError('every member must owe at least one cent');
  }
  const base = Math.floor(totalCents / memberIds.length);
  let remainder = totalCents - base * memberIds.length;

  // Stable member order first, so the rotation is the only source of variation.
  const ordered = [...memberIds].sort();
  const digest = createHash('sha256').update(hangoutId).digest();
  const offset = digest.readUInt32BE(0) % ordered.length;

  /** @type {Map<string, number>} */
  const shares = new Map(ordered.map((memberId) => [memberId, base]));
  for (let step = 0; remainder > 0; step += 1, remainder -= 1) {
    const memberId = ordered[(offset + step) % ordered.length];
    shares.set(memberId, (shares.get(memberId) ?? base) + 1);
  }
  return memberIds.map((memberId) => ({
    memberId,
    shareCents: shares.get(memberId) ?? base,
  }));
}

/**
 * @param {number} cents
 * @returns {string} the provider's two-decimal representation
 */
export function toProviderAmount(cents) {
  assertCents(cents);
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/**
 * Parse an amount a provider sent back. Anything that is not exactly two decimal
 * places is refused rather than rounded: a mismatch means our view and theirs
 * have diverged, and rounding would hide it.
 *
 * @param {string} amount
 * @returns {number}
 */
export function parseProviderAmount(amount) {
  if (typeof amount !== 'string' || !/^-?\d+\.\d{2}$/.test(amount)) {
    throw new TypeError(
      `provider amount must be a decimal with exactly two decimal places, received ${String(amount)}`,
    );
  }
  const negative = amount.startsWith('-');
  const [whole, fraction] = amount.replace('-', '').split('.');
  const cents = Number(whole) * 100 + Number(fraction);
  return assertCents(negative ? -cents : cents);
}

/**
 * Confirm a provider echoed the amount we asked for, before any entry is written.
 *
 * @param {number} expectedCents
 * @param {string} providerAmount
 */
export function assertProviderEcho(expectedCents, providerAmount) {
  const actual = parseProviderAmount(providerAmount);
  if (actual !== assertCents(expectedCents)) {
    throw new RangeError(
      `provider amount ${providerAmount} does not match the requested ${toProviderAmount(expectedCents)}`,
    );
  }
  return actual;
}
