/**
 * The constraint vault: one encrypted record per member, readable only by its owner.
 *
 * Each member's record is sealed under a key derived from the master key and that
 * member's id, so one member's key cannot open another's record even if the
 * ciphertext leaks. AES-256-GCM means tampering fails loudly instead of returning
 * plausible-looking constraints.
 *
 * For the demo the master key lives in an ignored .env. Production would use
 * envelope encryption with a managed KMS; that is stated, not implemented.
 */
import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

export class ConstraintVault {
  /** @type {Map<string, { memberId: string, ciphertext: string, iv: string, tag: string, keyId: string, updatedAt: string }>} */
  #records = new Map();
  /** @type {Buffer} */
  #masterKey;

  /** @param {{ masterKey: string, keyId?: string }} input master key as 64 hex chars */
  constructor({ masterKey, keyId = 'demo-v1' }) {
    if (!/^[0-9a-f]{64}$/i.test(masterKey)) {
      throw new TypeError('the vault master key must be 32 bytes of hex');
    }
    this.#masterKey = Buffer.from(masterKey, 'hex');
    this.keyId = keyId;
  }

  /** @param {string} memberId */
  #keyFor(memberId) {
    if (!memberId) throw new TypeError('a vault key needs a member id');
    return Buffer.from(
      hkdfSync(
        'sha256',
        this.#masterKey,
        Buffer.from(memberId),
        Buffer.from('unspoken-constraints'),
        32,
      ),
    );
  }

  /**
   * @param {string} memberId
   * @param {unknown} constraints
   */
  put(memberId, constraints) {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.#keyFor(memberId), iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(constraints), 'utf8'),
      cipher.final(),
    ]);
    const record = {
      memberId,
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      keyId: this.keyId,
      updatedAt: new Date().toISOString(),
    };
    this.#records.set(memberId, record);
    return { ...record };
  }

  /**
   * @param {string} memberId
   * @param {{ ciphertext: string, iv: string, tag: string }} record
   */
  decryptRecord(memberId, record) {
    try {
      const decipher = createDecipheriv(
        ALGORITHM,
        this.#keyFor(memberId),
        Buffer.from(record.iv, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(record.tag, 'base64'));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(record.ciphertext, 'base64')),
        decipher.final(),
      ]);
      return JSON.parse(plaintext.toString('utf8'));
    } catch {
      // Deliberately vague and non-specific: the failure mode must not become an oracle.
      throw new Error('the constraint record could not be decrypted');
    }
  }

  /** @param {string} memberId */
  get(memberId) {
    const record = this.#records.get(memberId);
    if (!record) throw new RangeError(`no constraints stored for ${memberId}`);
    return this.decryptRecord(memberId, record);
  }

  /**
   * Explicit reader identity, so an authorization mistake is a thrown error
   * rather than a silent cross-member read.
   *
   * @param {string} readerId
   * @param {string} ownerId
   */
  readAs(readerId, ownerId) {
    if (readerId !== ownerId) {
      throw new Error('only the owner may read their own constraints');
    }
    return this.get(ownerId);
  }

  /** @param {string} memberId */ forget(memberId) {
    this.#records.delete(memberId);
  }

  /**
   * Restore a sealed record read back from durable storage (e.g. after a
   * restart wiped this process's memory). The record is only trusted after
   * a successful decrypt with this instance's master key.
   * @param {string} memberId
   * @param {{ ciphertext: string, iv: string, tag: string }} record
   */
  load(memberId, record) {
    this.decryptRecord(memberId, record);
    this.#records.set(memberId, { ...record, keyId: this.keyId });
  }
}
