// Thin wrapper around CallRail's REST API v3 — used for polling (see
// src/lib/callrail/poll.ts) as the primary way calls/texts reach this app,
// since CallRail's own outbound webhook delivery could not be gotten
// working reliably on the account's side. Call objects returned by
// GET .../calls.json already use the same field names (id,
// customer_phone_number, tracking_phone_number, answered, duration,
// start_time) that src/lib/callrail/webhook.ts's parseCallWebhookPayload
// already recognizes — confirmed empirically against a real account, not
// assumed — so a raw call object can be passed straight into
// processCallWebhook unchanged. Text messages need reshaping first; see
// poll.ts.

const CALLRAIL_API_BASE = "https://api.callrail.com/v3";

export class CallRailApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "CallRailApiError";
  }
}

async function callRailGet(
  apiKey: string,
  path: string,
  params: Record<string, string>,
): Promise<unknown> {
  const url = new URL(`${CALLRAIL_API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: { Authorization: `Token token=${apiKey}` },
  });
  if (!response.ok) {
    throw new CallRailApiError(
      `CallRail API request failed: ${response.status} ${response.statusText}`,
      response.status,
    );
  }
  return response.json();
}

async function callRailPost(
  apiKey: string,
  path: string,
  body: Record<string, string>,
): Promise<unknown> {
  const response = await fetch(`${CALLRAIL_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Token token=${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    // CallRail's error body (e.g. "read-only key", a bad/unverified
    // number) is genuinely useful to the caller here, unlike the GET
    // helper above — this is a real write with real-world side effects
    // (an actual phone call), so surface CallRail's own explanation rather
    // than a generic status code.
    let detail = response.statusText;
    try {
      const errorBody = (await response.json()) as { error?: string };
      if (errorBody.error) detail = errorBody.error;
    } catch {
      // Body wasn't JSON — fall back to statusText.
    }
    throw new CallRailApiError(`CallRail API request failed: ${detail}`, response.status);
  }
  return response.json();
}

/**
 * "Call back" (docs: owner-initiated callback on a missed call) — CallRail
 * dials business_phone_number (the owner) first; once answered, it bridges
 * to customer_phone_number using caller_id (the original tracking number)
 * as the caller ID the customer sees, so the callback looks like it's
 * coming from the same number that rang them originally. Confirmed via
 * CallRail's own API docs (POST /v3/a/{account}/calls.json) — not yet
 * exercised against a real call, since the API key configured for this
 * account is deliberately read-only (see src/lib/callrail/poll.ts's
 * comment on why polling uses a read-only key) and a write-scoped key is
 * required for this specific feature.
 */
export async function createOutboundCall(
  apiKey: string,
  accountId: string,
  input: { callerId: string; customerPhoneNumber: string; businessPhoneNumber: string },
): Promise<{ id: string }> {
  const result = (await callRailPost(apiKey, `/a/${accountId}/calls.json`, {
    caller_id: input.callerId,
    customer_phone_number: input.customerPhoneNumber,
    business_phone_number: input.businessPhoneNumber,
  })) as { id: string };
  return result;
}

/**
 * Raw call objects, already in the shape processCallWebhook/
 * parseCallWebhookPayload expect — deliberately typed loosely
 * (Record<string, unknown>) rather than re-declaring every CallRail field,
 * matching how the webhook payload is already handled.
 */
export async function fetchRecentCalls(
  apiKey: string,
  accountId: string,
  startDate: string,
): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  let page = 1;
  // CallRail's max page size; a small business's call volume over the
  // lookback window (see poll.ts) should always fit in one page, but this
  // loop is here so a busier account never silently drops records.
  const perPage = "250";

  for (;;) {
    const data = (await callRailGet(apiKey, `/a/${accountId}/calls.json`, {
      start_date: startDate,
      per_page: perPage,
      page: String(page),
    })) as { calls?: unknown; total_pages?: number };

    const calls = Array.isArray(data.calls) ? (data.calls as Record<string, unknown>[]) : [];
    results.push(...calls);

    if (!data.total_pages || page >= data.total_pages || calls.length === 0) break;
    page += 1;
  }

  return results;
}

export interface CallRailConversation {
  customer_phone_number?: unknown;
  current_tracking_number?: unknown;
  recent_messages?: unknown;
}

/** Raw conversation objects — see poll.ts for how these get flattened into individual incoming messages. */
export async function fetchRecentTexts(
  apiKey: string,
  accountId: string,
  startDate: string,
): Promise<CallRailConversation[]> {
  const results: CallRailConversation[] = [];
  let page = 1;
  const perPage = "250";

  for (;;) {
    const data = (await callRailGet(apiKey, `/a/${accountId}/text-messages.json`, {
      start_date: startDate,
      per_page: perPage,
      page: String(page),
    })) as { conversations?: unknown; total_pages?: number };

    const conversations = Array.isArray(data.conversations)
      ? (data.conversations as CallRailConversation[])
      : [];
    results.push(...conversations);

    if (!data.total_pages || page >= data.total_pages || conversations.length === 0) break;
    page += 1;
  }

  return results;
}
