// Domain core, batch 1: money, ledger, idempotency.
// Written before the implementations exist (TDD red step).
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertCents,
  splitShares,
  toProviderAmount,
  parseProviderAmount,
} from '../services/api/src/money.mjs';
import { Ledger } from '../services/api/src/ledger.mjs';
import { IdempotencyStore } from '../services/api/src/idempotency.mjs';

test('money: only integer cents are accepted', () => {
  assert.equal(assertCents(2800), 2800);
  assert.equal(assertCents(0), 0);
  assert.equal(
    assertCents(-500),
    -500,
    'signed amounts are legal in the ledger',
  );
  for (const bad of [2800.5, '2800', NaN, Infinity, null, undefined, 1e21]) {
    assert.throws(
      () => assertCents(bad),
      /integer cents/,
      `accepted ${String(bad)}`,
    );
  }
});

test('money: shares always sum to the total, and the odd cent rotates', () => {
  // 2800 / 3 does not divide: somebody must pay the extra cent.
  const a = splitShares(2800, ['m1', 'm2', 'm3'], 'hangout-A');
  assert.equal(
    a.reduce((sum, s) => sum + s.shareCents, 0),
    2800,
    'shares must reconstruct the total exactly',
  );
  for (const s of a) assert.ok(s.shareCents === 933 || s.shareCents === 934);

  // Deterministic for one hangout: a retry must produce identical shares.
  assert.deepEqual(splitShares(2800, ['m1', 'm2', 'm3'], 'hangout-A'), a);

  // Across hangouts the extra cent must not always land on the same person,
  // or one member silently subsidises every hangout.
  const payers = new Set();
  for (let i = 0; i < 40; i += 1) {
    const shares = splitShares(2800, ['m1', 'm2', 'm3'], `hangout-${i}`);
    payers.add(shares.find((s) => s.shareCents === 934)?.memberId);
  }
  assert.ok(
    payers.size > 1,
    'the rounding remainder must rotate between members',
  );

  // Exact division leaves nobody paying extra.
  const even = splitShares(3000, ['m1', 'm2', 'm3'], 'hangout-B');
  assert.deepEqual(
    even.map((s) => s.shareCents),
    [1000, 1000, 1000],
  );

  assert.throws(() => splitShares(100, [], 'h'), /at least one member/);
  assert.throws(
    () => splitShares(2, ['m1', 'm2', 'm3'], 'h'),
    /at least one cent/,
  );
});

test('money: provider amounts round-trip exactly and reject drift', () => {
  assert.equal(toProviderAmount(2800), '28.00');
  assert.equal(toProviderAmount(5), '0.05');
  assert.equal(toProviderAmount(0), '0.00');
  assert.equal(parseProviderAmount('28.00'), 2800);
  assert.equal(parseProviderAmount('0.05'), 5);
  // A provider reply that does not match what we sent must be rejected, not rounded.
  assert.throws(() => parseProviderAmount('28.001'), /two decimal places/);
  assert.throws(() => parseProviderAmount('28'), /two decimal places/);
  assert.throws(() => parseProviderAmount('abc'), /two decimal places/);
});

test('ledger: a hold is not money, so it never becomes an entry', () => {
  const ledger = new Ledger();
  assert.throws(
    () =>
      ledger.append({
        hangoutId: 'h1',
        kind: 'share_authorized',
        amountCents: -2800,
        providerEventId: 'evt-1',
      }),
    /not a ledger kind/,
    'an authorization is a hold, not a movement of money',
  );
});

test('ledger: provenance is mandatory for real entries', () => {
  const ledger = new Ledger();
  assert.throws(
    () =>
      ledger.append({
        hangoutId: 'h1',
        kind: 'share_captured',
        amountCents: 2800,
      }),
    /provider event/,
    'a real-looking entry with no verified event must be impossible',
  );
  // Synthetic fixture money needs no provider event, and never counts as verified.
  ledger.append({
    hangoutId: 'h1',
    kind: 'share_captured',
    amountCents: 2800,
    synthetic: true,
  });
  // A correction is the only other exception, and it must name what it corrects.
  assert.throws(
    () =>
      ledger.append({ hangoutId: 'h1', kind: 'correction', amountCents: -1 }),
    /corrects/,
  );
});

test('ledger: sums are split by provenance and are signed', () => {
  const ledger = new Ledger();
  ledger.append({
    hangoutId: 'h1',
    kind: 'share_captured',
    amountCents: 2800,
    synthetic: true,
  });
  ledger.append({
    hangoutId: 'h1',
    kind: 'share_captured',
    amountCents: 2800,
    providerEventId: 'evt-capture-1',
  });
  ledger.append({
    hangoutId: 'h1',
    kind: 'provider_fee',
    amountCents: -95,
    providerEventId: 'evt-capture-1',
  });
  const sums = ledger.sums('h1');
  assert.equal(
    sums.verifiedCents,
    2705,
    'verified = provider-backed entries only',
  );
  assert.equal(sums.syntheticCents, 2800);
  assert.equal(sums.displayCents, 5505);
  // Refunds can push a hangout's verified sum negative; that must be representable.
  ledger.append({
    hangoutId: 'h1',
    kind: 'refund',
    amountCents: -2800,
    providerEventId: 'evt-refund-1',
  });
  assert.equal(
    ledger.sums('h1').verifiedCents,
    -95,
    'a signed sum, never clamped',
  );
});

test('ledger: one provider event may write an amount and its fee, but not twice', () => {
  const ledger = new Ledger();
  ledger.append({
    hangoutId: 'h1',
    kind: 'share_captured',
    amountCents: 2800,
    providerEventId: 'evt-1',
  });
  ledger.append({
    hangoutId: 'h1',
    kind: 'provider_fee',
    amountCents: -95,
    providerEventId: 'evt-1',
  });
  // Replaying the same event must not double-apply.
  assert.throws(
    () =>
      ledger.append({
        hangoutId: 'h1',
        kind: 'share_captured',
        amountCents: 2800,
        providerEventId: 'evt-1',
      }),
    /already recorded/,
  );
  assert.equal(ledger.sums('h1').verifiedCents, 2705);
});

test('ledger: entries are append-only and carry no reason text', () => {
  const ledger = new Ledger();
  ledger.append({
    hangoutId: 'h1',
    kind: 'share_captured',
    amountCents: 2800,
    providerEventId: 'evt-1',
  });
  const entries = ledger.entries('h1');
  assert.equal(entries.length, 1);
  /** @type {any[]} */ (entries).push({ tampered: true });
  assert.equal(
    ledger.entries('h1').length,
    1,
    'callers must not be able to mutate the ledger',
  );
  assert.ok(
    !('reason' in entries[0]),
    'a ledger entry must not carry a reason',
  );
});

test('idempotency: a retry replays, a different body or target conflicts', () => {
  const store = new IdempotencyStore();
  const first = store.remember({
    actor: 'm1',
    operation: 'commitShare',
    key: 'k-1',
    target: { hangoutId: 'h1' },
    body: { shareCents: 2800 },
    response: { ok: true, orderId: 'o-1' },
  });
  assert.deepEqual(first, { ok: true, orderId: 'o-1' });

  // Same everything: replay the stored response rather than acting twice.
  const replay = store.lookup({
    actor: 'm1',
    operation: 'commitShare',
    key: 'k-1',
    target: { hangoutId: 'h1' },
    body: { shareCents: 2800 },
  });
  assert.deepEqual(replay, {
    status: 'replay',
    response: { ok: true, orderId: 'o-1' },
  });

  // Key order in the body must not matter; the digest is canonical.
  assert.equal(
    store.lookup({
      actor: 'm1',
      operation: 'commitShare',
      key: 'k-1',
      target: { hangoutId: 'h1' },
      body: { shareCents: 2800 },
    }).status,
    'replay',
  );

  // Same key, different hangout: replaying h1's success would silently fail to act on h2.
  assert.equal(
    store.lookup({
      actor: 'm1',
      operation: 'commitShare',
      key: 'k-1',
      target: { hangoutId: 'h2' },
      body: { shareCents: 2800 },
    }).status,
    'conflict',
  );
  // Same key, different amount.
  assert.equal(
    store.lookup({
      actor: 'm1',
      operation: 'commitShare',
      key: 'k-1',
      target: { hangoutId: 'h1' },
      body: { shareCents: 9900 },
    }).status,
    'conflict',
  );
  // Unknown key is a miss, which means "go ahead and do the work".
  assert.equal(
    store.lookup({
      actor: 'm1',
      operation: 'commitShare',
      key: 'k-2',
      target: { hangoutId: 'h1' },
      body: { shareCents: 2800 },
    }).status,
    'miss',
  );
});
