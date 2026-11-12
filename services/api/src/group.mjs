/**
 * A group of existing friends. Size is the privacy floor, not a product nicety:
 * with fewer than three members a single "that does not work for me" is
 * attributable to one person, which is the thing this product exists to prevent.
 */
export class Group {
  /** @type {Set<string>} */
  #members = new Set();

  /** @param {{ groupId: string, minSize?: number, maxSize?: number }} input */
  constructor({ groupId, minSize = 3, maxSize = 8 }) {
    if (!groupId) throw new TypeError('a group needs an id');
    if (minSize < 3)
      throw new RangeError(
        'the minimum group size is 3, so no single refusal is attributable',
      );
    this.groupId = groupId;
    this.minSize = minSize;
    this.maxSize = maxSize;
  }

  get size() {
    return this.#members.size;
  }

  /** @returns {string[]} member ids in stable order */
  members() {
    return [...this.#members].sort();
  }

  /** @param {string} memberId */
  add(memberId) {
    if (!memberId) throw new TypeError('a member needs an id');
    if (this.#members.has(memberId))
      throw new RangeError(`${memberId} is already a member`);
    if (this.#members.size >= this.maxSize) {
      throw new RangeError(`a group holds at most ${this.maxSize} members`);
    }
    this.#members.add(memberId);
    return this;
  }

  /** @param {string} memberId */
  remove(memberId) {
    if (!this.#members.has(memberId))
      throw new RangeError(`${memberId} is not a member`);
    this.#members.delete(memberId);
    return this;
  }

  /** @param {string} memberId */
  has(memberId) {
    return this.#members.has(memberId);
  }

  /**
   * Whether a hangout may be planned at all. Deliberately a boolean: exposing
   * "needs one more" plus a member list would let the group work out who is missing.
   */
  readyToPlan() {
    return this.#members.size >= this.minSize;
  }
}
