// All-or-nothing settlement: the money orchestration, against a fake provider.
import test from 'node:test';
import assert from 'node:assert/strict';

import { Settlement } from '../services/api/src/payments/settlement.mjs';
import { FakeProvider } from '../services/api/src/payments/fake-provider.mjs';
import {
  PaymentGate,
  GateClosedError,
} from '../services/api/src/payments/gate.mjs';
import { Ledger } from '../services/api/src/ledger.mjs';

const MEMBERS = ['m1', 'm2', 'm3'];
const VENUE = 'venue@business.example.com';

/** @param {{ gateOpen?: boolean, provider?: FakeProvider }} [options] */
function build(options = {}) {
  const provider = options.provider ?? new FakeProvider();
  const ledger = new Ledger();
  const gate =
    options.gateOpen === true
      ? new PaymentGate({
          open: true,
          humanApprovalRecorded: true,
          approvalReference: 'test-only',
        })
      : new PaymentGate({ open: false });
  const settlement = new Settlement({
    provider,
    ledger,
    gate,
    venuePayee: VENUE,
  });
  return { settlement, provider, ledger, gate };
}

test('settlement: opening commitments creates one order per member and records no money', () => {
  const { settlement, provider, ledger } = build();
  const opened = settlement.openCommitments({
    hangoutId: 'h1',
    memberIds: MEMBERS,
    totalCents: 8400,
  });
  assert.equal(opened.commitments.length, 3);
  assert.equal(
    opened.commitments.reduce((sum, c) => sum + c.shareCents, 0),
    8400,
  );
  // Each order names the venue as payee, so the platform is never in the flow.
  for (const order of provider.orders.values()) {
    assert.equal(order.payee, VENUE);
    assert.equal(order.intent, 'AUTHORIZE');
  }
  assert.equal(
    ledger.sums('h1').entryCount,
    0,
    'creating an order moves no money',
  );
  assert.equal(settlement.progress('h1').committedCount, 0);
});

test('settlement: progress is a count, never names', () => {
  const { settlement, provider } = build();
  settlement.openCommitments({
    hangoutId: 'h1',
    memberIds: MEMBERS,
    totalCents: 8400,
  });
  const order = settlement.orderFor('h1', 'm1');
  provider.approve(order.orderId);
  settlement.recordAuthorization({
    hangoutId: 'h1',
    memberId: 'm1',
    evidence: 'readback',
  });
  const progress = settlement.progress('h1');
  assert.deepEqual(Object.keys(progress).sort(), [
    'committedCount',
    'memberCount',
    'state',
  ]);
  assert.equal(progress.committedCount, 1);
  assert.equal(progress.memberCount, 3);
  assert.ok(
    !JSON.stringify(progress).includes('m1'),
    'progress must not name who has committed',
  );
});

test('settlement: a return-URL hit is never evidence of an authorization', () => {
  const { settlement, provider } = build();
  settlement.openCommitments({
    hangoutId: 'h1',
    memberIds: MEMBERS,
    totalCents: 8400,
  });
  provider.approve(settlement.orderFor('h1', 'm1').orderId);
  assert.throws(
    () =>
      settlement.recordAuthorization(
        /** @type {any} */ ({
          hangoutId: 'h1',
          memberId: 'm1',
          evidence: 'return_url',
        }),
      ),
    /readback or a signature-verified/,
  );
});

test('settlement: capture is refused while the gate is closed', () => {
  const { settlement, provider, ledger } = build();
  settlement.openCommitments({
    hangoutId: 'h1',
    memberIds: MEMBERS,
    totalCents: 8400,
  });
  for (const memberId of MEMBERS) {
    provider.approve(settlement.orderFor('h1', memberId).orderId);
    settlement.recordAuthorization({
      hangoutId: 'h1',
      memberId,
      evidence: 'readback',
    });
  }
  assert.equal(settlement.progress('h1').state, 'SETTLING');
  assert.throws(() => settlement.settle('h1'), GateClosedError);
  assert.equal(
    ledger.sums('h1').entryCount,
    0,
    'a refused settlement records nothing',
  );
});

test('settlement: all held, then captured — ledger records amounts and fees', () => {
  const { settlement, provider, ledger } = build({ gateOpen: true });
  settlement.openCommitments({
    hangoutId: 'h1',
    memberIds: MEMBERS,
    totalCents: 8400,
  });
  for (const memberId of MEMBERS) {
    provider.approve(settlement.orderFor('h1', memberId).orderId);
    settlement.recordAuthorization({
      hangoutId: 'h1',
      memberId,
      evidence: 'readback',
    });
  }
  const result = settlement.settle('h1');
  assert.equal(result.state, 'CONFIRMED');
  const sums = ledger.sums('h1');
  // Three captures of 2800, each with the fake provider's 2% fee.
  assert.equal(sums.verifiedCents, 8400 - 3 * 56);
  assert.equal(
    sums.entryCount,
    6,
    'each capture writes its amount and its fee',
  );
  assert.ok(
    !JSON.stringify(result).includes('reserved'),
    'a capture is not a reservation',
  );
  assert.equal(result.venueConfirmed, false, 'nothing here books a venue');
});

test('settlement: cannot capture before every share is held', () => {
  const { settlement, provider } = build({ gateOpen: true });
  settlement.openCommitments({
    hangoutId: 'h1',
    memberIds: MEMBERS,
    totalCents: 8400,
  });
  provider.approve(settlement.orderFor('h1', 'm1').orderId);
  settlement.recordAuthorization({
    hangoutId: 'h1',
    memberId: 'm1',
    evidence: 'readback',
  });
  assert.throws(() => settlement.settle('h1'), /all three shares/);
});

test('settlement: one decline voids every hold and charges nobody', () => {
  const { settlement, provider, ledger } = build({ gateOpen: true });
  settlement.openCommitments({
    hangoutId: 'h1',
    memberIds: MEMBERS,
    totalCents: 8400,
  });
  for (const memberId of ['m1', 'm2']) {
    provider.approve(settlement.orderFor('h1', memberId).orderId);
    settlement.recordAuthorization({
      hangoutId: 'h1',
      memberId,
      evidence: 'readback',
    });
  }
  const result = settlement.decline({ hangoutId: 'h1', memberId: 'm3' });
  assert.equal(result.state, 'NOT_HAPPENING');
  assert.equal(result.voidedCount, 2);
  assert.equal(
    ledger.sums('h1').entryCount,
    0,
    'a void moves no money, so it writes no entry',
  );
  for (const authorization of provider.authorizations.values()) {
    assert.equal(authorization.status, 'VOIDED');
  }
  // The outcome must not say who declined.
  assert.ok(!JSON.stringify(result).includes('m3'));
});

test('settlement: a deadline that passes voids exactly like a decline', () => {
  const { settlement, provider } = build({ gateOpen: true });
  settlement.openCommitments({
    hangoutId: 'h1',
    memberIds: MEMBERS,
    totalCents: 8400,
  });
  provider.approve(settlement.orderFor('h1', 'm1').orderId);
  settlement.recordAuthorization({
    hangoutId: 'h1',
    memberId: 'm1',
    evidence: 'readback',
  });
  const result = settlement.deadlinePassed('h1');
  assert.equal(result.state, 'NOT_HAPPENING');
  assert.equal(result.voidedCount, 1);
});

test('settlement: a failed capture refunds the captures that succeeded', () => {
  const provider = new FakeProvider({ failCaptureFor: ['m3'] });
  const { settlement, ledger } = build({ gateOpen: true, provider });
  settlement.openCommitments({
    hangoutId: 'h1',
    memberIds: MEMBERS,
    totalCents: 8400,
  });
  for (const memberId of MEMBERS) {
    provider.approve(settlement.orderFor('h1', memberId).orderId);
    settlement.recordAuthorization({
      hangoutId: 'h1',
      memberId,
      evidence: 'readback',
    });
  }
  const result = /** @type {any} */ (settlement.settle('h1'));
  assert.equal(result.state, 'SETTLEMENT_FAILED');
  assert.equal(
    result.refundedCount,
    2,
    'the two successful captures must be given back',
  );
  const sums = ledger.sums('h1');
  // Two captures and two fees in, two refunds out: the fees are not refunded, so
  // the hangout ends negative. That is the honest number, not zero.
  assert.equal(sums.verifiedCents, -112);
  assert.ok(sums.verifiedCents < 0, 'a signed sum must represent the fee loss');
});

test('settlement: retried calls are idempotent and never double-charge', () => {
  const { settlement, provider, ledger } = build({ gateOpen: true });
  settlement.openCommitments({
    hangoutId: 'h1',
    memberIds: MEMBERS,
    totalCents: 8400,
  });
  // Re-opening must not create a second set of orders.
  const again = settlement.openCommitments({
    hangoutId: 'h1',
    memberIds: MEMBERS,
    totalCents: 8400,
  });
  assert.equal(again.commitments.length, 3);
  assert.equal(provider.orders.size, 3, 'a retry must not create more orders');

  for (const memberId of MEMBERS) {
    provider.approve(settlement.orderFor('h1', memberId).orderId);
    settlement.recordAuthorization({
      hangoutId: 'h1',
      memberId,
      evidence: 'readback',
    });
    // A duplicate webhook for the same authorization must be harmless.
    settlement.recordAuthorization({
      hangoutId: 'h1',
      memberId,
      evidence: 'webhook',
    });
  }
  settlement.settle('h1');
  const first = ledger.sums('h1');
  settlement.settle('h1');
  assert.deepEqual(
    ledger.sums('h1'),
    first,
    'settling twice must not capture twice',
  );
  assert.equal(
    provider.captureCalls,
    3,
    'the provider must not be called again',
  );
});

test('settlement: the provider echo is checked before anything is recorded', () => {
  const provider = new FakeProvider({ echoWrongAmountFor: ['m2'] });
  const { settlement, ledger } = build({ gateOpen: true, provider });
  settlement.openCommitments({
    hangoutId: 'h1',
    memberIds: MEMBERS,
    totalCents: 8400,
  });
  for (const memberId of MEMBERS) {
    provider.approve(settlement.orderFor('h1', memberId).orderId);
    settlement.recordAuthorization({
      hangoutId: 'h1',
      memberId,
      evidence: 'readback',
    });
  }
  const result = settlement.settle('h1');
  assert.equal(
    result.state,
    'SETTLEMENT_FAILED',
    'a mismatched amount must not be recorded',
  );
  assert.ok(
    ledger
      .entries('h1')
      .every(
        (entry) =>
          entry.kind !== 'share_captured' || entry.amountCents === 2800,
      ),
    'no entry may hold an amount the provider did not confirm',
  );
});
