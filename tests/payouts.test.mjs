// US-006: PayPal Payouts sandbox adapter. Every call injects fetch; tests
// never touch the network. Money moves only when the gate opens; this module
// only speaks the sandbox protocol.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPayoutsClient,
  PayPalError,
} from '../services/api/src/payments/payouts.mjs';

const CLIENT = {
  clientId: 'id',
  secret: 'shh',
  baseUrl: 'https://api-m.sandbox.example',
};

/** @param {any} body */
const jsonRes = (body, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});

test('payout: oauth then batch create, sender_item_id carries the bound key', async () => {
  /** @type {any[]} */
  const calls = [];
  const client = createPayoutsClient({
    ...CLIENT,
    fetchFn: /** @type {any} */ (
      async (/** @type {any} */ url, /** @type {any} */ init) => {
        calls.push([
          url,
          String(init.headers?.['content-type'] ?? '').includes('json')
            ? JSON.parse(init.body)
            : init.body,
        ]);
        if (String(url).endsWith('/v1/oauth2/token'))
          return jsonRes({ access_token: 'tok', expires_in: 3600 });
        return jsonRes({
          batch_header: { payout_batch_id: 'B-1', batch_status: 'PENDING' },
        });
      }
    ),
  });
  const out = await client.createPayout({
    senderBatchId: 'batch-h1',
    items: [
      {
        senderItemId: 'abc123hash',
        recipientEmail: 'r@example.com',
        amountCents: 3500,
      },
    ],
  });
  assert.equal(out.batchId, 'B-1');
  const [, createBody] = calls[1];
  assert.equal(createBody.sender_batch_header.sender_batch_id, 'batch-h1');
  assert.equal(createBody.items[0].recipient_type, 'EMAIL');
  assert.equal(createBody.items[0].receiver, 'r@example.com');
  assert.equal(createBody.items[0].amount.value, '35.00');
  assert.equal(createBody.items[0].sender_item_id, 'abc123hash');
});

test('payout: token failure and batch failure raise PayPalError, never raw', async () => {
  const badToken = createPayoutsClient({
    ...CLIENT,
    fetchFn: /** @type {any} */ (
      async () => jsonRes({ error: 'nope' }, false, 401)
    ),
  });
  await assert.rejects(
    badToken.createPayout({ senderBatchId: 'b', items: [] }),
    PayPalError,
  );

  let n = 0;
  const badBatch = createPayoutsClient({
    ...CLIENT,
    fetchFn: /** @type {any} */ (
      async (/** @type {any} */ url) => {
        n += 1;
        if (String(url).endsWith('/v1/oauth2/token'))
          return jsonRes({ access_token: 't', expires_in: 10 });
        return jsonRes(
          { name: 'VALIDATION_ERROR', message: 'bad receiver' },
          false,
          400,
        );
      }
    ),
  });
  await assert.rejects(
    badBatch.createPayout({
      senderBatchId: 'b',
      items: [{ senderItemId: 'k', recipientEmail: 'x', amountCents: 1 }],
    }),
    (/** @type {any} */ e) => e instanceof PayPalError && e.status === 400,
  );
  assert.equal(n, 2);
});

test('payout: batch read maps item statuses', async () => {
  const client = createPayoutsClient({
    ...CLIENT,
    fetchFn: /** @type {any} */ (
      async (/** @type {any} */ url) => {
        if (String(url).endsWith('/v1/oauth2/token'))
          return jsonRes({ access_token: 't', expires_in: 10 });
        return jsonRes({
          batch_header: { payout_batch_id: 'B-1', batch_status: 'SUCCESS' },
          items: [
            {
              payout_item_id: 'I-1',
              transaction_status: 'SUCCESS',
              payout_item: { sender_item_id: 'abc123hash' },
            },
            {
              payout_item_id: 'I-2',
              transaction_status: 'FAILED',
              payout_item: { sender_item_id: 'def456hash' },
            },
          ],
        });
      }
    ),
  });
  const batch = await client.getPayoutBatch('B-1');
  assert.equal(batch.status, 'SUCCESS');
  assert.deepEqual(
    batch.items.map(
      (/** @type {{ senderItemId: string, status: string }} */ i) => [
        i.senderItemId,
        i.status,
      ],
    ),
    [
      ['abc123hash', 'SUCCESS'],
      ['def456hash', 'FAILED'],
    ],
  );
});

test('webhook verification delegates to PayPal and returns a boolean', async () => {
  const mk = (/** @type {string} */ verdict) =>
    createPayoutsClient({
      ...CLIENT,
      fetchFn: /** @type {any} */ (
        async (/** @type {any} */ url) => {
          if (String(url).endsWith('/v1/oauth2/token'))
            return jsonRes({ access_token: 't', expires_in: 10 });
          return jsonRes({ verification_status: verdict });
        }
      ),
    });
  const args = {
    transmissionId: 't',
    transmissionTime: 'now',
    certUrl: 'https://x',
    authAlgo: 'a',
    transmissionSig: 's',
    webhookId: 'W-1',
    body: { id: 'evt' },
  };
  assert.equal(await mk('SUCCESS').verifyWebhook(args), true);
  assert.equal(await mk('FAILURE').verifyWebhook(args), false);
});
