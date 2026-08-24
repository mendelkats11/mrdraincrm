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
