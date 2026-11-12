import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const specPath = new URL(
  '../docs/03-architecture/openapi.json',
  import.meta.url,
);

/** @returns {any} */
function loadSpec() {
  return JSON.parse(readFileSync(specPath, 'utf8'));
}

/**
 * Collect every [path, node] pair in the document.
 * @param {any} node
 * @param {string} path
 * @param {[string, any][]} out
 * @returns {[string, any][]}
 */
function walk(node, path = '$', out = []) {
  out.push([path, node]);
  if (Array.isArray(node)) {
    node.forEach((item, index) => walk(item, `${path}[${index}]`, out));
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node))
      walk(value, `${path}.${key}`, out);
  }
  return out;
}

/**
 * Resolve a local JSON pointer like #/components/schemas/Foo.
 * @param {any} spec
 * @param {string} ref
 * @returns {any}
 */
function resolveRef(spec, ref) {
  assert.ok(ref.startsWith('#/'), `only local refs are allowed: ${ref}`);
  let node = spec;
  for (const segment of ref.slice(2).split('/')) {
    node = node?.[segment.replace(/~1/g, '/').replace(/~0/g, '~')];
    if (node === undefined) return undefined;
  }
  return node;
}

test('contract document is parseable OpenAPI 3.1 marked as an unfrozen draft', () => {
  const spec = loadSpec();
  assert.equal(spec.openapi, '3.1.0');
  assert.equal(spec.info.version, '0.1.0-draft');
  assert.equal(spec.info['x-contract-status'], 'draft');
  assert.equal(spec.info['x-frozen'], false);
  assert.equal(spec.servers.length, 1);
  assert.match(spec.servers[0].url, /^http:\/\/127\.0\.0\.1:\d+\/api\/v1$/);
});

test('every local $ref resolves and every operation is documented', () => {
  const spec = loadSpec();
  for (const [where, node] of walk(spec)) {
    if (node && typeof node === 'object' && typeof node.$ref === 'string') {
      assert.notEqual(
        resolveRef(spec, node.$ref),
        undefined,
        `${where}: unresolved ${node.$ref}`,
      );
    }
  }
  const methods = ['get', 'post', 'put', 'patch', 'delete'];
  /** @type {Set<string>} */
  const operationIds = new Set();
  let operationCount = 0;
  for (const [route, item] of Object.entries(spec.paths)) {
    const present = methods.filter((method) => item[method]);
    assert.ok(present.length > 0, `${route}: no operations`);
    for (const method of present) {
      const operation = item[method];
      operationCount += 1;
      assert.ok(
        operation.operationId,
        `${route} ${method}: missing operationId`,
      );
      assert.ok(
        !operationIds.has(operation.operationId),
        `duplicate ${operation.operationId}`,
      );
      operationIds.add(operation.operationId);
      assert.ok(operation.summary, `${operation.operationId}: missing summary`);
      assert.ok(
        Object.keys(operation.responses ?? {}).length > 0,
        `${operation.operationId}: no responses`,
      );
      for (const [status, response] of Object.entries(operation.responses)) {
        assert.match(
          status,
          /^[1-5]\d\d$/,
          `${operation.operationId}: odd status ${status}`,
        );
        assert.ok(
          response.$ref || response.description,
          `${operation.operationId} ${status}: missing description`,
        );
      }
    }
  }
  assert.ok(
    operationCount >= 20,
    `expected a complete surface, found ${operationCount}`,
  );
});

test('money is always integer cents with the agreed bounds and USD currency', () => {
  const spec = loadSpec();
  const schemas = spec.components.schemas;
  assert.equal(schemas.Currency.const, 'USD');
  assert.equal(schemas.AmountCents.type, 'integer');
  assert.equal(schemas.ContributionAmountCents.type, 'integer');
  // The 1500 ceiling is from the product brief; the floor is an undecided draft
  // proposal (D-P01), so assert that a documented floor exists, not its value (XR-27).
  assert.equal(schemas.ContributionAmountCents.maximum, 1500);
  assert.equal(schemas.ContributionAmountCents.default, 500);
  assert.ok(Number.isInteger(schemas.ContributionAmountCents.minimum));
  assert.ok(schemas.ContributionAmountCents.minimum > 0);
  assert.match(schemas.ContributionAmountCents.description, /draft proposal/i);

  const moneyRefs = new Set([
    '#/components/schemas/AmountCents',
    '#/components/schemas/ContributionAmountCents',
  ]);
  for (const [where, node] of walk(spec)) {
    if (!/\.properties\.[A-Za-z]*[Cc]ents$/.test(where)) continue;
    const isMoneyRef =
      typeof node.$ref === 'string' && moneyRefs.has(node.$ref);
    assert.ok(
      isMoneyRef || node.type === 'integer',
      `${where}: monetary field must be integer cents, got ${JSON.stringify(node).slice(0, 80)}`,
    );
  }
  for (const [where, node] of walk(spec)) {
    if (node && typeof node === 'object' && node.type === 'number') {
      assert.ok(
        where.startsWith('$.components.schemas.SyntheticGraph'),
        `${where}: floating-point numbers are only allowed in the synthetic graph`,
      );
    }
  }
});

test('a successful suggestion set is exactly three plans or an explicit unavailable outcome', () => {
  const { components } = loadSpec();
  const set = components.schemas.SuggestionSet;
  assert.equal(set.properties.plans.minItems, 3);
  assert.equal(set.properties.plans.maxItems, 3);
  assert.equal(set.properties.retriesUsed.maximum, 1);
  assert.deepEqual(set.properties.outcome.enum, ['three_plans', 'unavailable']);
  assert.equal(set.oneOf.length, 2);
  const shapes = set.oneOf.map((/** @type {any} */ branch) => [
    branch.required?.[0],
    branch.not?.required?.[0],
  ]);
  assert.deepEqual(shapes, [
    ['plans', 'unavailableReason'],
    ['unavailableReason', 'plans'],
  ]);
});

test('approval, payment and attendance never assert payment, reservation or penalty', () => {
  const { components } = loadSpec();
  const approval = components.schemas.PlanApproval.properties;
  assert.equal(approval.isPayment.const, false);
  assert.equal(approval.isReservation.const, false);
  assert.equal(approval.approvedBy.const, 'deterministic_host_action');
  const payment = components.schemas.PaymentState.properties;
  assert.equal(payment.reservationConfirmed.const, false);
  assert.equal(payment.attendanceConfirmed.const, false);
  assert.equal(payment.environment.const, 'sandbox');
  assert.equal(
    components.schemas.AttendanceState.properties.penaltyApplied.const,
    false,
  );
  assert.equal(
    components.schemas.SubscriptionState.properties.environment.const,
    'sandbox',
  );
  assert.equal(
    components.schemas.Venue.properties.availabilityKnown.const,
    false,
  );
});

test('numeric closeness values exist only in the labelled synthetic graph', () => {
  const spec = loadSpec();
  const graph = spec.components.schemas.SyntheticGraph;
  assert.equal(graph.properties.synthetic.const, true);
  assert.equal(
    graph.properties.nodes.items.properties.nodeId.pattern,
    '^synthetic-',
  );
  const edge = graph.properties.edges.items;
  assert.ok(
    edge.required.includes('textEquivalent'),
    'every edge needs a text equivalent',
  );
  assert.ok(
    edge.required.includes('stateLabel'),
    'every edge needs a non-color state label',
  );
  assert.equal(edge.properties.strength.maximum, 1);

  const closeness =
    /\.properties\.(strength|score|tieStrength|closeness|driftScore|rank)$/;
  for (const [where] of walk(spec)) {
    if (!closeness.test(where)) continue;
    assert.ok(
      where.startsWith('$.components.schemas.SyntheticGraph'),
      `${where}: closeness values may not appear outside the synthetic graph`,
    );
  }
  assert.equal(
    spec.paths['/demo/graph'].get.parameters.find(
      (/** @type {any} */ parameter) => parameter.name === 'scene',
    ).schema.enum.length,
    2,
    'demo scenes are a closed set, not a data-source switch',
  );
});

test('pause collects no reason and privacy pending states stay explicit', () => {
  const { components } = loadSpec();
  const pause = components.schemas.PauseRequest;
  assert.equal(pause.additionalProperties, false);
  for (const name of Object.keys(pause.properties)) {
    assert.doesNotMatch(
      name,
      /reason|why|hardship|explain|note/i,
      `PauseRequest.${name}`,
    );
  }
  assert.deepEqual(
    components.schemas.ParticipationState.properties.collectionEffect.enum,
    ['policy_pending'],
  );
  assert.equal(
    components.schemas.ParticipationState.properties.reasonCollected.const,
    false,
  );
  assert.deepEqual(
    components.schemas.ConsentState.properties.ownDataAccess.enum,
    ['policy_pending'],
  );
  assert.deepEqual(
    components.schemas.LeaveResult.properties.forfeitPolicy.enum,
    ['disclosed_proposal_pending_review'],
  );
  assert.equal(
    components.schemas.LeaveResult.properties.providerCancellationClaimed.const,
    false,
  );
  assert.equal(
    components.schemas.LeaveResult.properties.refundClaimed.const,
    false,
  );
  assert.equal(
    components.schemas.ConsentState.properties.trackingEnabled.default,
    false,
  );
});

test('payment-executing operations document a closed gate and no simulated success', () => {
  const spec = loadSpec();
  const gated = [
    ['/circles/{circleId}/subscriptions', 'post'],
    ['/circles/{circleId}/turns/{turnId}/venue-payments', 'post'],
  ];
  for (const [route, method] of gated) {
    const operation = spec.paths[route][method];
    assert.equal(
      operation.responses['409'].$ref,
      '#/components/responses/PaymentGateBlocked',
      `${operation.operationId}: must document the closed payment gate`,
    );
  }
  assert.equal(
    spec.components.schemas.PaymentGateError.allOf[1].properties.gate.$ref,
    '#/components/schemas/GateState',
    'the payment gate must reuse the shared gate shape',
  );
  const gate = spec.components.schemas.GateState.properties;
  assert.equal(gate.open.const, false);
  assert.equal(gate.humanApprovalRecorded.const, false);
  assert.ok(
    spec.components.schemas.Error.properties.code.enum.includes(
      'payment_gate_blocked',
    ),
  );
  const states =
    spec.components.schemas.SubscriptionState.properties.state.enum;
  for (const required of [
    'blocked',
    'created',
    'approved',
    'active',
    'payment_received',
  ]) {
    assert.ok(
      states.includes(required),
      `subscription state ${required} must be distinct`,
    );
  }
});

test('the venue is paid by Payouts, with fees recorded and PENDING distinct from success', () => {
  const spec = loadSpec();
  const payment = spec.components.schemas.PaymentState;
  assert.deepEqual(payment.properties.state.enum, [
    'blocked',
    'payout_pending',
    'unverified',
    'payout_success',
    'payout_denied',
    'failed',
  ]);
  // Orders/Checkout cannot spend collected funds, so no order field may linger.
  assert.equal(payment.properties.providerOrderId, undefined);
  assert.ok(
    payment.properties.providerPayoutBatchId,
    'payout batch id must be representable',
  );
  assert.ok(
    payment.required.includes('feeCents'),
    'provider fee must always be reported',
  );
  assert.equal(
    payment.properties.feeCents.$ref,
    '#/components/schemas/AmountCents',
  );

  const kinds = spec.components.schemas.LedgerEntry.properties.kind.enum;
  for (const kind of ['venue_payment_sent', 'provider_fee']) {
    assert.ok(kinds.includes(kind), `ledger must record ${kind}`);
  }
  assert.ok(
    !kinds.includes('venue_payment_captured'),
    'capture wording belongs to Orders, not Payouts',
  );

  const create =
    spec.paths['/circles/{circleId}/turns/{turnId}/venue-payments'].post;
  assert.match(create.description, /Payouts/);
  assert.match(create.description, /PENDING/);
  assert.match(create.description, /never implies a venue reservation/i);
  assert.equal(payment.properties.reservationConfirmed.const, false);
});

test('cross-review fixes: synthetic money cannot gate a real payment (XR-03, XR-05)', () => {
  const { components } = loadSpec();
  const ledger = components.schemas.Ledger.properties;
  for (const field of [
    'potCentsDerived',
    'potCentsVerified',
    'potCentsSynthetic',
  ]) {
    assert.equal(
      ledger[field].$ref,
      '#/components/schemas/SignedAmountCents',
      field,
    );
  }
  assert.match(
    ledger.potCentsVerified.description,
    /ONLY figure any payment-path budget check may use/,
  );
  assert.match(ledger.potCentsDerived.description, /display only/i);
  // A signed sum must not be typed as non-negative, or a deficit becomes unrepresentable.
  assert.equal(components.schemas.SignedAmountCents.minimum, undefined);
  const circle = components.schemas.Circle;
  assert.equal(
    circle.properties.potCentsVerified.$ref,
    '#/components/schemas/SignedAmountCents',
  );
  for (const field of ['potCentsDerived', 'potCentsVerified', 'potLabel']) {
    assert.ok(
      circle.required.includes(field),
      `Circle must always carry ${field}`,
    );
  }
  assert.ok(components.schemas.Ledger.required.includes('potLabel'));
});

test('cross-review fixes: real-member graph inference is gated closed (XR-01, XR-02)', () => {
  const spec = loadSpec();
  const gate = spec.components.schemas.GateState.properties;
  assert.equal(gate.open.const, false);
  assert.equal(gate.humanApprovalRecorded.const, false);
  assert.ok(
    spec.components.responses.GraphGateBlocked,
    'a graph gate response must exist',
  );
  assert.ok(
    spec.components.schemas.Error.properties.code.enum.includes(
      'graph_gate_blocked',
    ),
  );
  const suggestions =
    spec.paths['/circles/{circleId}/turns/{turnId}/plan-suggestions'].post;
  assert.equal(
    suggestions.responses['503'].content['application/json'].schema.$ref,
    '#/components/schemas/GraphGateError',
  );
  assert.match(
    suggestions.description,
    /NO tie- or drift-derived input reaches the prompt/,
  );
  // Host-facing copy must be a server-chosen key, never model free text.
  const plan = spec.components.schemas.Plan.properties;
  assert.equal(plan.rationale, undefined, 'free-text rationale must be gone');
  assert.ok(
    Array.isArray(plan.rationaleKey.enum) && plan.rationaleKey.enum.length > 0,
  );
  for (const key of plan.rationaleKey.enum) {
    assert.doesNotMatch(
      key,
      /drift|fad|risk|warn|score|rank/i,
      `rationale key ${key}`,
    );
  }
});

test('cross-review fixes: prompt inputs are closed vocabularies (XR-13)', () => {
  const request = loadSpec().components.schemas.CreatePlanSuggestionsRequest;
  assert.equal(request.additionalProperties, false);
  assert.equal(
    request.properties.availabilityNote,
    undefined,
    'free-text note must be gone',
  );
  for (const field of ['availability', 'preferences']) {
    assert.ok(
      Array.isArray(request.properties[field].items.enum),
      `${field} must be a closed set`,
    );
  }
  assert.ok(
    request.properties.maxBudgetCents,
    'client may only lower the server budget',
  );
  assert.match(request.properties.maxBudgetCents.description, /never raise/i);
});

test('cross-review fixes: pause, peer view and turn states stop pre-deciding policy (XR-07, XR-08, XR-22, XR-23)', () => {
  const { components } = loadSpec();
  const members = components.schemas.Circle.properties.members;
  assert.equal(members.maxItems, 6);
  assert.equal(
    members.items.properties.state.const,
    'accepted',
    'peer view must not expose invited, left or paused',
  );
  assert.ok(components.schemas.Circle.properties.pendingInvitationCount);
  assert.deepEqual(
    components.schemas.Circle.properties.participationStateVisibility.enum,
    ['policy_pending'],
  );
  assert.ok(
    !components.schemas.Turn.properties.state.enum.includes('skipped'),
    'skipped presumes an undecided host-decline rule',
  );
});

test('cross-review fixes: unverified payment state and complete refusals exist (XR-14, XR-18, XR-24, XR-11)', () => {
  const spec = loadSpec();
  assert.ok(
    spec.components.schemas.PaymentState.properties.state.enum.includes(
      'unverified',
    ),
  );
  assert.ok(
    spec.components.schemas.SubscriptionState.properties.state.enum.includes(
      'unverified',
    ),
  );
  assert.ok(
    spec.components.schemas.Error.properties.constraint,
    'refusals need structured bounds',
  );
  assert.ok(
    spec.paths['/circles/{circleId}/contribution-proposals'].post.responses[
      '409'
    ],
    'a stale membership version must be refusable',
  );
  const manual = spec.paths['/circles/{circleId}/turns/{turnId}/plans'];
  assert.ok(manual, 'the non-AI plan path needs an operation');
  assert.equal(manual.post.operationId, 'createManualPlan');
  for (const [route, method] of [
    ['/circles/{circleId}/turns/{turnId}/approvals', 'post'],
    ['/circles/{circleId}/turns/{turnId}/venue-payments', 'post'],
  ]) {
    assert.match(spec.paths[route][method].description, /circle_not_ready/);
  }
});

test('cross-review fixes: every operation declares rate-limit and server-error responses (XR-27)', () => {
  const spec = loadSpec();
  const methods = ['get', 'post', 'put', 'patch', 'delete'];
  let count = 0;
  for (const [route, item] of Object.entries(spec.paths)) {
    for (const method of methods.filter((m) => item[m])) {
      count += 1;
      for (const status of ['429', '500']) {
        assert.ok(
          item[method].responses[status],
          `${route} ${method}: missing ${status}`,
        );
      }
    }
  }
  assert.equal(count, 24, 'operation count must match what the docs claim');
});

test('cross-review fixes: the payment gate waits on Q-006, not only on sandbox evidence (XR-06)', () => {
  const spec = loadSpec();
  for (const [route, method] of [
    ['/circles/{circleId}/subscriptions', 'post'],
    ['/circles/{circleId}/turns/{turnId}/venue-payments', 'post'],
  ]) {
    const description = spec.paths[route][method].description;
    assert.match(description, /Q-006/, `${route}: Q-006 must gate the payment`);
    assert.match(
      description,
      /YT-025/,
      `${route}: the legal assessment must gate the payment`,
    );
  }
});

test('webhook ingress is unauthenticated by design but verified before effects', () => {
  const spec = loadSpec();
  const webhook = spec.paths['/webhooks/paypal'].post;
  assert.deepEqual(webhook.security, []);
  assert.ok(webhook.responses['401'], 'invalid signature must be rejectable');
  const ack = spec.components.schemas.WebhookAcknowledgement.properties;
  assert.equal(ack.signatureVerified.const, true);
  assert.ok(
    spec.components.schemas.WebhookAcknowledgement.required.includes(
      'duplicate',
    ),
  );
  assert.ok(
    spec.components.schemas.WebhookAcknowledgement.required.includes(
      'effectsApplied',
    ),
  );
});
