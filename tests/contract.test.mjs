// Contract tests for the Unspoken UX-spec flow (US-001, ADR 0007).
// They replace the retired YourTurn circle/turn/Payouts suite. They are
// structural checks against the committed document, not evidence that any
// route is implemented.
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

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const MUTATING = ['post', 'put', 'patch', 'delete'];

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

/**
 * Every operation as { route, method, operation }.
 * @param {any} spec
 */
function operations(spec) {
  /** @type {{ route: string, method: string, operation: any }[]} */
  const list = [];
  for (const [route, item] of Object.entries(spec.paths))
    for (const method of METHODS)
      if (item[method]) list.push({ route, method, operation: item[method] });
  return list;
}

/**
 * Names of every schema reachable from a node, following $refs.
 * @param {any} spec
 * @param {any} node
 * @param {Set<string>} seen
 */
function reachableSchemas(spec, node, seen = new Set()) {
  for (const [, child] of walk(node)) {
    if (!child || typeof child !== 'object' || typeof child.$ref !== 'string')
      continue;
    let target = resolveRef(spec, child.$ref);
    const match = child.$ref.match(/^#\/components\/schemas\/(.+)$/);
    if (match) {
      if (seen.has(match[1])) continue;
      seen.add(match[1]);
    } else if (target === undefined) continue;
    reachableSchemas(spec, target, seen);
  }
  return seen;
}

/** @param {any} spec @param {string} operationId */
function findOperation(spec, operationId) {
  const found = operations(spec).find(
    ({ operation }) => operation.operationId === operationId,
  );
  assert.ok(found, `missing operation ${operationId}`);
  return found;
}

test('contract is parseable OpenAPI 3.1, an unfrozen draft under ADR 0007', () => {
  const spec = loadSpec();
  assert.equal(spec.openapi, '3.1.0');
  assert.equal(spec.info.version, '0.2.0-draft');
  assert.equal(spec.info['x-contract-status'], 'draft');
  assert.equal(spec.info['x-frozen'], false);
  assert.equal(spec.info['x-task'], 'US-001');
  assert.equal(spec.info['x-adr'], '0007');
  assert.match(spec.info['x-architect-approval'].approvedBy, /Architect/);
  assert.equal(spec.servers.length, 1);
  assert.match(spec.servers[0].url, /^http:\/\/127\.0\.0\.1:\d+\/api\/v1$/);
});

test('every local $ref resolves and every operation is fully documented', () => {
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
  const ids = new Set();
  const list = operations(spec);
  for (const { route, method, operation } of list) {
    const label = `${method.toUpperCase()} ${route}`;
    assert.ok(operation.operationId, `${label}: missing operationId`);
    assert.ok(
      !ids.has(operation.operationId),
      `duplicate ${operation.operationId}`,
    );
    ids.add(operation.operationId);
    assert.ok(operation.summary, `${operation.operationId}: missing summary`);
    assert.equal(
      operation.tags?.length,
      1,
      `${operation.operationId}: one tag`,
    );
    for (const [status, response] of Object.entries(operation.responses)) {
      assert.match(
        status,
        /^[1-5]\d\d$/,
        `${operation.operationId}: ${status}`,
      );
      assert.ok(
        response.$ref || response.description,
        `${operation.operationId} ${status}`,
      );
    }
    for (const status of ['429', '500'])
      assert.ok(
        operation.responses[status],
        `${operation.operationId}: no ${status}`,
      );
  }
  // The documented count in API.md must match the document.
  assert.equal(list.length, 74, 'operation count must match API.md');
});

test('every mutating operation needs a session and a CSRF token, except the webhook', () => {
  const spec = loadSpec();
  const unauthenticated = new Set([
    'requestPhoneCode',
    'createSession',
    'receiveProviderWebhook',
  ]);
  for (const { method, operation } of operations(spec)) {
    const id = operation.operationId;
    if (unauthenticated.has(id)) {
      assert.deepEqual(operation.security, [], `${id}: must be explicit`);
      continue;
    }
    assert.equal(operation.security, undefined, `${id}: inherits the session`);
    assert.ok(operation.responses['401'], `${id}: needs 401`);
    if (!MUTATING.includes(method)) continue;
    const params = (operation.parameters ?? []).map(
      (/** @type {any} */ p) => p.$ref,
    );
    assert.ok(
      params.includes('#/components/parameters/CsrfToken'),
      `${id}: CSRF`,
    );
    assert.ok(operation.responses['403'], `${id}: needs 403`);
  }
});

test('the retired hold/capture/void, pot, circle and Payouts surface is gone', () => {
  const spec = loadSpec();
  const text = JSON.stringify(spec);
  for (const state of [
    'COMMITTING',
    'SETTLING',
    'VOIDING',
    'NOT_HAPPENING',
    'SETTLEMENT_FAILED',
  ])
    assert.ok(!text.includes(state), `retired state ${state} still present`);
  const retired =
    /capture|void|authoriz|hold|circle|turn|payout|pot|contribution|venue-?payment/i;
  for (const { route, operation } of operations(spec)) {
    assert.doesNotMatch(route, retired, `retired route ${route}`);
    assert.doesNotMatch(
      operation.operationId,
      retired,
      `retired ${operation.operationId}`,
    );
  }
  for (const name of Object.keys(spec.components.schemas))
    assert.doesNotMatch(
      name,
      /circle|turn|payout|pot|contribution|graph/i,
      `retired schema ${name}`,
    );
});

test('the hangout state list is exactly the ADR 0007 list', () => {
  const spec = loadSpec();
  assert.deepEqual(spec.components.schemas.HangoutState.enum, [
    'PLANNING',
    'STRETCH_ASKS',
    'ACTIVITY_VOTE',
    'TIME_VOTE',
    'READY_CHECK',
    'AWAITING_CONFIRMATION',
    'BOOKING',
    'BOOKED',
    'BALANCES_OPEN',
    'SETTLED',
    'NO_PLAN',
    'BOOKING_FAILED',
  ]);
});

test('money is integer cents in USD everywhere', () => {
  const spec = loadSpec();
  const schemas = spec.components.schemas;
  assert.equal(schemas.Currency.const, 'USD');
  assert.equal(schemas.AmountCents.type, 'integer');
  assert.equal(schemas.AmountCents.minimum, 0);
  assert.equal(
    schemas.BudgetCents.multipleOf,
    100,
    'budgets are whole dollars',
  );
  assert.equal(schemas.SubscriptionState.properties.priceCents.const, 1500);
  const centsRefs = new Set(
    ['AmountCents', 'SignedAmountCents', 'BudgetCents'].map(
      (name) => `#/components/schemas/${name}`,
    ),
  );
  /** @param {any} node */
  const isCents = (node) =>
    node.type === 'integer' ||
    centsRefs.has(node.$ref) ||
    (node.oneOf ?? []).every(
      (/** @type {any} */ b) => b.type === 'null' || isCents(b),
    );
  let seen = 0;
  for (const [where, node] of walk(spec)) {
    if (!/\.properties\.[A-Za-z]*Cents$/.test(where)) continue;
    seen += 1;
    assert.ok(isCents(node), `${where}: must be integer cents`);
  }
  for (const { operation } of operations(spec))
    for (const param of operation.parameters ?? [])
      if (/Cents$/.test(param.name ?? ''))
        assert.ok(isCents(param.schema), `${param.name}: integer cents`);
  assert.ok(seen >= 15, `expected many money fields, saw ${seen}`);
  // No number type anywhere except the NYC map coordinates.
  for (const [where, node] of walk(spec))
    if (node && node.type === 'number')
      assert.match(
        where,
        /Event\.properties\.location\.properties\.(lat|lng)$/,
        where,
      );
});

test('Q-011 decisions 5, 6 and 14 are marked open with the strictest defaults', () => {
  const spec = loadSpec();
  const open = spec.info['x-open-decisions'];
  for (const decision of [1, 2, 4, 5, 6, 14, 16])
    assert.ok(
      open.some(
        (/** @type {any} */ d) =>
          d.question === 'Q-011' &&
          d.decision === decision &&
          d.status === 'open',
      ),
      `Q-011.${decision} missing from info`,
    );

  const payer = findOperation(spec, 'volunteerAsPayer').operation;
  assert.equal(payer['x-open-decision'].decision, 5);
  assert.match(payer['x-open-decision'].contractDefault, /volunteer/i);

  const confirm = findOperation(spec, 'confirmBooking').operation;
  assert.equal(confirm['x-open-decision'].decision, 6);
  assert.match(confirm['x-open-decision'].contractDefault, /only the payer/i);
  assert.match(confirm.responses['403'].description, /not_payer/);

  for (const id of ['getSplit', 'listOwnBalances', 'getOwnBalance']) {
    const operation = findOperation(spec, id).operation;
    assert.equal(operation['x-open-decision'].decision, 14, id);
    assert.match(
      operation['x-open-decision'].contractDefault,
      /only balances they are a party to/i,
    );
  }
  // Strict #14: there is no pod-wide ledger or balance route.
  for (const route of Object.keys(spec.paths))
    assert.doesNotMatch(route, /^\/pods\/[^/]+\/(ledger|balances)/, route);
  // Only the payer may confirm the split or change its total.
  for (const id of ['confirmSplit', 'setActualTotal'])
    assert.match(
      findOperation(spec, id).operation.responses['403'].description,
      /not_payer/,
    );
});

test('private limits, stretch asks, ratings and calendars reach no pod-scoped response', () => {
  const spec = loadSpec();
  const privateSchemas = [
    'PrivateLimits',
    'SetPrivateLimitsRequest',
    'StretchAsk',
    'PlannerChatMessage',
    'SetRatingRequest',
    'CalendarAccount',
    'OwnCalendar',
    'BudgetCents',
    'DietaryNeed',
  ];
  for (const { route, operation } of operations(spec)) {
    if (route.startsWith('/me/') || route === '/me') continue;
    const reached = new Set();
    for (const response of Object.values(operation.responses))
      reachableSchemas(spec, response, reached);
    for (const name of privateSchemas)
      assert.ok(!reached.has(name), `${operation.operationId} exposes ${name}`);
  }
  // A rating is sent from a pod route but returns nothing.
  const rate = findOperation(spec, 'rateOwnHangout').operation;
  assert.equal(rate.responses['204'].content, undefined);
  // No phone number in any schema about another person.
  for (const name of [
    'UserRef',
    'PodMember',
    'PollVote',
    'ReadyAnswer',
    'Balance',
    'Split',
    'PodMessage',
  ])
    assert.ok(
      !reachableSchemas(spec, spec.components.schemas[name]).has('PhoneE164'),
      `${name} must not carry a phone number`,
    );
});

test('no card or hangout explains a fit, a budget or a missing option', () => {
  const spec = loadSpec();
  const forbidden =
    /^(reason|rationale|why|whyThis|fit|fits|feasible|budgetFriendly|label|excluded|blockedBy)/i;
  for (const name of [
    'ShortlistOption',
    'Poll',
    'PollOption',
    'Hangout',
    'ReadyCheck',
    'CardRef',
    'PodMessage',
  ]) {
    for (const [where, node] of walk(spec.components.schemas[name]))
      if (/\.properties$/.test(where))
        for (const key of Object.keys(node))
          assert.doesNotMatch(key, forbidden, `${name}.${key}`);
  }
  assert.match(
    spec.components.schemas.ShortlistOption.description,
    /budget-friendly/,
  );
});

test('votes and ready-check answers are visible with names (Q-013)', () => {
  const spec = loadSpec();
  const { PollVote, ReadyAnswer, Poll } = spec.components.schemas;
  for (const schema of [PollVote, ReadyAnswer]) {
    assert.ok(schema.required.includes('userId'));
    assert.ok(schema.required.includes('firstName'));
    assert.equal(schema['x-visibility'], 'pod-with-names');
  }
  assert.match(PollVote.description, /Q-013/);
  assert.match(
    Poll.description,
    /lower per-person estimate wins, then the earlier start/,
  );
});

test('pods hold 3 to 8 people and invite links are single use', () => {
  const spec = loadSpec();
  const { Pod, CreatePodRequest, InviteLink, PodSummary } =
    spec.components.schemas;
  assert.equal(Pod.properties.minMembers.const, 3);
  assert.equal(Pod.properties.maxMembers.const, 8);
  assert.equal(Pod.properties.members.maxItems, 8);
  assert.equal(Pod.properties.memberCount.maximum, 8);
  assert.equal(PodSummary.properties.memberCount.maximum, 8);
  assert.equal(CreatePodRequest.properties.inviteUserIds.maxItems, 7);
  assert.equal(CreatePodRequest.properties.inviteUserIds.minItems, 0);
  assert.equal(InviteLink.properties.singleUse.const, true);
  assert.match(
    findOperation(spec, 'acceptInviteLink').operation.responses['409']
      .description,
    /invite_link_used/,
  );
  assert.match(
    findOperation(spec, 'startHangout').operation.responses['409'].description,
    /pod_too_small/,
  );
});

test('every pod-scoped route can answer 404 so membership is not disclosed', () => {
  const spec = loadSpec();
  for (const { route, operation } of operations(spec))
    if (route.startsWith('/pods/{podId}'))
      assert.ok(operation.responses['404'], `${operation.operationId}: no 404`);
});

test('bookings are simulated and labelled, never a real reservation', () => {
  const spec = loadSpec();
  const { Booking, ShortlistOption, Event } = spec.components.schemas;
  assert.equal(Booking.properties.simulated.const, true);
  assert.match(Booking.properties.simulatedLabel.const, /No real reservation/);
  assert.equal(ShortlistOption.properties.synthetic.const, true);
  assert.equal(Event.properties.synthetic.const, true);
});

test('balances use the spec statuses and settlement is gated closed with a required key', () => {
  const spec = loadSpec();
  const schemas = spec.components.schemas;
  assert.deepEqual(schemas.BalanceStatus.enum, [
    'owed',
    'pending',
    'paid',
    'failed',
  ]);
  assert.match(
    schemas.Balance.description,
    /never stored|No balance is stored/i,
  );
  assert.equal(
    schemas.SettlementPayment.properties.environment.const,
    'sandbox',
  );
  assert.match(schemas.SettlementPayment.description, /verified webhook/);
  const { operation } = findOperation(spec, 'createSettlementPayment');
  assert.equal(
    operation.responses['409'].$ref,
    '#/components/responses/PaymentGateBlocked',
  );
  assert.deepEqual(
    operation['x-payment-gate'].blockingQuestions.includes('Q-010'),
    true,
  );
  assert.equal(schemas.GateState.properties.open.const, false);
  assert.equal(schemas.GateState.properties.humanApprovalRecorded.const, false);
  for (const id of [
    'createSettlementPayment',
    'confirmSplit',
    'setActualTotal',
  ]) {
    const params = findOperation(spec, id).operation.parameters.map(
      (/** @type {any} */ p) => p.$ref,
    );
    assert.ok(
      params.includes('#/components/parameters/IdempotencyKeyRequired'),
      `${id}: key required`,
    );
  }
  assert.equal(
    spec.components.parameters.IdempotencyKeyRequired.required,
    true,
  );
  // Exactly one operation can move money.
  const moneyMovers = operations(spec).filter(
    ({ operation }) => operation['x-payment-gate'],
  );
  assert.deepEqual(
    moneyMovers.map(({ operation }) => operation.operationId),
    ['createSettlementPayment'],
  );
});

test('webhook ingress is unauthenticated by design but verified before effects', () => {
  const spec = loadSpec();
  const { operation } = findOperation(spec, 'receiveProviderWebhook');
  assert.deepEqual(operation.security, []);
  assert.match(
    operation.responses['401'].description,
    /webhook_signature_invalid/,
  );
  assert.match(operation.description, /before any ledger entry/);
  assert.match(operation.description, /safe to run twice/);
  const ack = spec.components.schemas.WebhookAcknowledgement.properties;
  assert.equal(ack.signatureVerified.const, true);
  assert.ok(ack.duplicate);
});

test('notifications have exactly four switches and nothing is sent without approval', () => {
  const spec = loadSpec();
  const settings = spec.components.schemas.NotificationSettings;
  assert.deepEqual(Object.keys(settings.properties), [
    'polls',
    'reminders',
    'privateAsks',
    'money',
  ]);
  assert.deepEqual(settings.required, [
    'polls',
    'reminders',
    'privateAsks',
    'money',
  ]);
  assert.equal(spec.info['x-notification-send-gate'].open, false);
  assert.match(settings.description, /never posted in pod chat/);
});

test('the subscription is a sandbox app-store plan separate from hangout money', () => {
  const spec = loadSpec();
  const sub = spec.components.schemas.SubscriptionState;
  assert.equal(sub.properties.environment.const, 'sandbox');
  assert.equal(sub.properties.period.const, 'month');
  assert.deepEqual(
    sub['x-open-decision'].map((/** @type {any} */ d) => d.decision),
    [1, 2],
  );
  const reached = reachableSchemas(spec, sub);
  assert.ok(!reached.has('Balance') && !reached.has('SettlementPayment'));
});
