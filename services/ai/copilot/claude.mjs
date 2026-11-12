// Muse integration (Anthropic Messages API) for the planner coordinator.
// The extractor defines the safe context, the output schema and the retry
// budget; this module is the only place that touches the network.
//
// Hard rules (mirror the extractor's):
// - The API key comes from ANTHROPIC_API_KEY (server env only, never logged,
//   never sent to the client). Tests inject a fake fetch and a direct key.
// - The model comes from ANTHROPIC_MODEL, falling back to DEFAULT_MODEL.
// - Prompts carry only what buildPromptContext returns: first name plus
//   plan-relevant tags. Budgets, emails, phones, hardship reasons and tie
//   scores never leave the process (asserted before every call).
// - Two attempts max; each attempt is schema-validated with
//   validateSuggestionSet. Then the honest "suggestions unavailable"
//   sentinel (rules-only path: no suggestions, host browses fixed venues).
// - fetch has a bounded timeout; an abort counts as a failed attempt.
import {
  buildPromptContext,
  validateSuggestionSet,
  findForbiddenFields,
} from './constraint-extractor.mjs';

/** Overridable deploy default; ANTHROPIC_MODEL wins when set. */
export const DEFAULT_MODEL = 'claude-sonnet-4-5';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

/**
 * One Messages request; resolves with the concatenated response text.
 *
 * @param {{ apiKey: string, model: string, system: string, user: string, maxTokens?: number, timeoutMs?: number, fetchFn?: (url: string, init?: any) => Promise<any> }} input
 */
export async function completeText({
  apiKey,
  model,
  system,
  user,
  maxTokens = 1024,
  timeoutMs = 20000,
  fetchFn = fetch,
}) {
  if (!apiKey) throw new TypeError('ANTHROPIC_API_KEY is not set');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) {
      const err = new Error(`claude request failed: ${res.status}`);
      err.code = 'claude_http_error';
      throw err;
    }
    const data = await res.json();
    return (data.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');
  } finally {
    clearTimeout(timer);
  }
}

/** Parse the first JSON array in model text. */
function parseJsonArray(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end <= start)
    throw new SyntaxError('no JSON array in response');
  return JSON.parse(text.slice(start, end + 1));
}

const SYSTEM_PROMPT = [
  'You suggest exactly 3 group hangout plans as a JSON array and nothing else.',
  'Each plan: candidateId, eventId, title, venue, dow (mon..sun), startsAt and',
  'endsAt (ISO datetimes), estCostPerPersonCents (integer cents), tags,',
  'dietaryOptions. Use only the interests given; invent nothing personal.',
].join(' ');

/**
 * Suggest plans for one member through Claude. Returns the validated plans,
 * or the unavailable sentinel when both attempts fail (bad schema, HTTP
 * error, timeout, or unparseable output).
 *
 * @param {{ firstName: string, constraints: object, apiKey?: string, model?: string, maxTokens?: number, timeoutMs?: number, fetchFn?: (url: string, init?: any) => Promise<any> }} input
 */
export async function suggestPlans({
  firstName,
  constraints,
  apiKey = process.env.ANTHROPIC_API_KEY ?? '',
  model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
  maxTokens,
  timeoutMs,
  fetchFn,
}) {
  const context = buildPromptContext(firstName, constraints);
  const leaked = findForbiddenFields(context);
  if (leaked.length > 0)
    throw new TypeError(`prompt context leaked: ${leaked.join(',')}`);
  const user = `Member context (safe subset only): ${JSON.stringify(context)}`;
  for (let i = 0; i < 2; i++) {
    let plans;
    try {
      const text = await completeText({
        apiKey,
        model,
        system: SYSTEM_PROMPT,
        user,
        maxTokens,
        timeoutMs,
        fetchFn,
      });
      plans = parseJsonArray(text);
    } catch {
      continue;
    }
    if (validateSuggestionSet(plans).valid) return { available: true, plans };
  }
  return { available: false };
}
