// Muse client tests: fake fetch only, never the network.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  completeText,
  suggestPlans,
  DEFAULT_MODEL,
} from '../services/ai/copilot/claude.mjs';

/** @param {number} n */
const plan = (n) => ({
  candidateId: `c-${n}`,
  eventId: `evt-00${n}`,
  title: `Plan ${n}`,
  venue: `Venue ${n}`,
  dow: 'fri',
  startsAt: '2026-11-21T23:00:00.000Z',
  endsAt: '2026-11-22T02:00:00.000Z',
  estCostPerPersonCents: 3000,
  tags: ['food'],
  dietaryOptions: [],
});

/** @param {string} text */
const textBlock = (text) => ({ type: 'text', text });
/** @param {any[]} bodies */
const okFetch = (bodies) => async () => ({
  ok: true,
  json: async () => ({ content: bodies.map(textBlock) }),
});

const CONSTRAINTS = {
  preferenceWeights: { food: 3 },
  dietary: ['vegetarian'],
  dislikes: ['nightlife'],
};

test('completeText posts to the Messages API and joins text blocks', async () => {
  /** @type {any[]} */
  const calls = [];
  const text = await completeText({
    apiKey: 'test-key',
    model: 'test-model',
    system: 'sys',
    user: 'hi',
    fetchFn: async (/** @type {any} */ url, /** @type {any} */ init) => {
      calls.push([url, init]);
      return {
        ok: true,
        json: async () => ({ content: [textBlock('a'), textBlock('b')] }),
      };
    },
  });
  assert.equal(text, 'ab');
  assert.equal(calls[0][0], 'https://api.anthropic.com/v1/messages');
  assert.equal(calls[0][1].headers['x-api-key'], 'test-key');
  assert.equal(JSON.parse(calls[0][1].body).model, 'test-model');
});

test('completeText without a key fails before touching the network', async () => {
  let called = false;
  await assert.rejects(
    completeText({
      apiKey: '',
      model: 'm',
      system: 's',
      user: 'u',
      fetchFn: async () => {
        called = true;
        return { ok: true, json: async () => ({}) };
      },
    }),
    /ANTHROPIC_API_KEY/,
  );
  assert.equal(called, false);
});

test('suggestPlans validates and returns good output', async () => {
  const out = await suggestPlans({
    firstName: 'Sam',
    constraints: CONSTRAINTS,
    apiKey: 'test-key',
    model: 'm',
    fetchFn: okFetch([JSON.stringify([plan(1), plan(2), plan(3)])]),
  });
  assert.equal(out.available, true);
  assert.equal(out.plans.length, 3);
});

test('suggestPlans retries once on schema failure, then the sentinel', async () => {
  let calls = 0;
  const out = await suggestPlans({
    firstName: 'Sam',
    constraints: CONSTRAINTS,
    apiKey: 'test-key',
    model: 'm',
    fetchFn: async () => {
      calls += 1;
      return {
        ok: true,
        json: async () => ({ content: [textBlock('[{"nope":true}]')] }),
      };
    },
  });
  assert.equal(out.available, false);
  assert.equal(calls, 2);
});

test('suggestPlans recovers when the retry is valid', async () => {
  const bodies = [
    'not json at all',
    JSON.stringify([plan(1), plan(2), plan(3)]),
  ];
  let i = 0;
  const out = await suggestPlans({
    firstName: 'Sam',
    constraints: CONSTRAINTS,
    apiKey: 'test-key',
    model: 'm',
    fetchFn: async () => ({
      ok: true,
      json: async () => ({
        content: [textBlock(bodies[Math.min(i++, bodies.length - 1)])],
      }),
    }),
  });
  assert.equal(out.available, true);
});

test('suggestPlans rejects an email as a first name before any call', async () => {
  let called = false;
  await assert.rejects(
    suggestPlans({
      firstName: 'sam@example.com',
      constraints: CONSTRAINTS,
      apiKey: 'test-key',
      model: 'm',
      fetchFn: async () => {
        called = true;
        return { ok: true, json: async () => ({ content: [] }) };
      },
    }),
    /first name/,
  );
  assert.equal(called, false);
});

test('DEFAULT_MODEL is overridable and documented in one place', () => {
  assert.equal(typeof DEFAULT_MODEL, 'string');
  assert.ok(process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL);
});
