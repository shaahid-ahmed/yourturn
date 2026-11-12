/**
 * PayPal Payouts sandbox adapter (US-006, ADR 0009).
 *
 * Boundary rules:
 * - Sandbox only. The base URL is caller-supplied; production hosts are
 *   refused outright (fail at construction, not at the till).
 * - The recipient is identified by email only. No PayPal IDs, no phones.
 * - `senderItemId` must be an opaque, HMAC-bound idempotency key produced by
 *   the caller (see settlement). Raw member/hangout ids never leave.
 * - Amounts cross as decimal strings; cents are the only integer form here.
 * - Every failure surfaces as PayPalError (status + PayPal name/message).
 *   No raw Response leaks, no retries inside this module.
 */
const PRODUCTION_HOSTS = new Set(['api-m.paypal.com', 'api.paypal.com']);

export class PayPalError extends Error {
  /** @param {string} message @param {{ status?: number, name?: string }} [detail] */
  constructor(message, detail = {}) {
    super(message);
    this.name = 'PayPalError';
    this.status = detail.status ?? null;
    this.providerName = detail.name ?? null;
  }
}

/**
 * @param {number} cents
 */
function toDecimal(cents) {
  if (!Number.isSafeInteger(cents) || cents <= 0)
    throw new PayPalError('amount must be positive whole cents');
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

/**
 * @param {{ clientId: string, secret: string, baseUrl: string, fetchFn?: (url: string, init?: any) => Promise<any>, timeoutMs?: number }} input
 */
export function createPayoutsClient({
  clientId,
  secret,
  baseUrl,
  fetchFn = fetch,
  timeoutMs = 20000,
}) {
  if (!clientId || !secret)
    throw new PayPalError('sandbox API credentials are required');
  let host;
  try {
    host = new URL(baseUrl).host;
  } catch {
    throw new PayPalError('base URL is not a URL');
  }
  if (PRODUCTION_HOSTS.has(host))
    throw new PayPalError(
      'refusing a production PayPal host in the sandbox adapter',
    );

  /** @type {{ token: string, at: number } | null} */
  let cached = null;

  /**
   * @param {string} path
   * @param {{ method?: string, body?: unknown, auth?: string }} [options]
   */
  async function call(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers = /** @type {Record<string, string>} */ ({
      'content-type': 'application/json',
    });
    if (options.auth) headers.authorization = options.auth;
    try {
      const res = await fetchFn(baseUrl + path, {
        method: options.method ?? 'POST',
        signal: controller.signal,
        headers,
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      if (!res.ok) {
        let detail = /** @type {any} */ ({});
        try {
          detail = await res.json();
        } catch {
          detail = {};
        }
        throw new PayPalError(`paypal ${path} failed: ${res.status}`, {
          status: res.status,
          name: detail.name,
        });
      }
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function token() {
    if (cached && Date.now() < cached.at) return cached.token;
    const basic = Buffer.from(`${clientId}:${secret}`).toString('base64');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchFn(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          authorization: `Basic ${basic}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      if (!res.ok)
        throw new PayPalError(`paypal oauth failed: ${res.status}`, {
          status: res.status,
        });
      const data = await res.json();
      if (!data.access_token)
        throw new PayPalError('paypal oauth returned no token');
      cached = {
        token: data.access_token,
        at: Date.now() + (data.expires_in ?? 300) * 1000,
      };
      return cached.token;
    } finally {
      clearTimeout(timer);
    }
  }

  const bearer = async () => `Bearer ${await token()}`;

  return {
    /**
     * @param {{ senderBatchId: string, emailSubject?: string, items: { senderItemId: string, recipientEmail: string, amountCents: number, currency?: string, note?: string }[] }} input
     */
    async createPayout({ senderBatchId, emailSubject, items }) {
      if (!senderBatchId)
        throw new PayPalError('a sender batch id is required');
      if (!items.length)
        throw new PayPalError('at least one payout item is required');
      const auth = await bearer();
      const data = await call('/v1/payments/payouts', {
        auth,
        body: {
          sender_batch_header: {
            sender_batch_id: senderBatchId,
            email_subject: emailSubject ?? 'You received a payment',
          },
          items: items.map((item) => {
            if (!item.senderItemId || !item.recipientEmail)
              throw new PayPalError(
                'each item needs an opaque sender_item_id and a recipient email',
              );
            return {
              recipient_type: 'EMAIL',
              receiver: item.recipientEmail,
              amount: {
                value: toDecimal(item.amountCents),
                currency: item.currency ?? 'USD',
              },
              note: item.note ?? '',
              sender_item_id: item.senderItemId,
            };
          }),
        },
      });
      const header = data.batch_header ?? {};
      return {
        batchId: header.payout_batch_id,
        status: header.batch_status ?? 'UNKNOWN',
      };
    },

    /** @param {string} batchId */
    async getPayoutBatch(batchId) {
      const auth = await bearer();
      const data = await call(
        `/v1/payments/payouts/${encodeURIComponent(batchId)}`,
        {
          method: 'GET',
          auth,
        },
      );
      const header = data.batch_header ?? {};
      return {
        batchId: header.payout_batch_id ?? batchId,
        status: header.batch_status ?? 'UNKNOWN',
        items: (data.items ?? []).map((/** @type {any} */ item) => ({
          payoutItemId: item.payout_item_id,
          senderItemId: item.payout_item?.sender_item_id,
          status: item.transaction_status,
        })),
      };
    },

    /**
     * Verify a PayPal webhook transmission through PayPal itself. Returns a
     * boolean; verification failure is data, not an exception.
     * @param {{ transmissionId: string, transmissionTime: string, certUrl: string, authAlgo: string, transmissionSig: string, webhookId: string, body: any }} input
     */
    async verifyWebhook({
      transmissionId,
      transmissionTime,
      certUrl,
      authAlgo,
      transmissionSig,
      webhookId,
      body,
    }) {
      const auth = await bearer();
      const data = await call('/v1/notifications/verify-webhook-signature', {
        auth,
        body: {
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          cert_url: certUrl,
          auth_algo: authAlgo,
          transmission_sig: transmissionSig,
          webhook_id: webhookId,
          webhook_event: body,
        },
      });
      return data.verification_status === 'SUCCESS';
    },
  };
}
