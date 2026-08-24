import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { fetchRecentCalls, fetchRecentTexts, type CallRailConversation } from "./api-client";
import { processCallWebhook, processMessageWebhook } from "./calls";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

// CallRail's start_date filter is date-granularity, not time-granularity,
// and this runs on a 15-minute interval (src/instrumentation.ts) — a wide,
// overlapping lookback window costs almost nothing for a small business's
// call volume, and means a missed poll (a restart, a brief outage) can
// never lose a call the way a tight/precise cursor could. Real
// deduplication comes entirely from the DB-level unique constraint on
// callrailCallId/callrailMessageId (processCallWebhook/processMessageWebhook
// already enforce this for the webhook path — reused unchanged here), not
// from this window being narrow.
export const LOOKBACK_DAYS = 2;

export function lookbackStartDate(now: Date): string {
  const d = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/**
 * The text-messages API returns conversation-threaded history (both
 * directions mixed into one `recent_messages` array per conversation),
 * unlike the flat per-event shape the webhook path and
 * parseMessageWebhookPayload expect — this reshapes one into the other,
 * filtering to incoming-only (docs/CLAUDE.md §6: "Outgoing SMS is not part
 * of V1" — the webhook path only ever received incoming-message events by
 * construction, so polling must apply the same filter explicitly here).
 *
 * sms_thread.id is not documented as guaranteed-unique per message (only
 * observed to be so against a real account) — composing it with the
 * message's own timestamp guards against silently dropping a second
 * message that shared a thread id, at zero cost to correctly deduplicating
 * the exact same message across repeated polls (same thread + same
 * timestamp recomputes the same id every time).
 *
 * Pure and exported for direct unit testing — kept separate from the
 * network/DB orchestration in pollCallRail below.
 */
export function flattenIncomingTexts(
  conversations: CallRailConversation[],
): Record<string, unknown>[] {
  const flattened: Record<string, unknown>[] = [];

  for (const conversation of conversations) {
    const customerPhone = conversation.customer_phone_number;
    const trackingNumber = conversation.current_tracking_number;
    const messages = Array.isArray(conversation.recent_messages)
      ? conversation.recent_messages
      : [];

    for (const raw of messages) {
      if (typeof raw !== "object" || raw === null) continue;
      const message = raw as Record<string, unknown>;
      if (message["direction"] !== "incoming") continue;

      const smsThread = message["sms_thread"];
      const threadId =
        typeof smsThread === "object" && smsThread !== null
          ? (smsThread as Record<string, unknown>)["id"]
          : null;
      const createdAt = message["created_at"];
      if (typeof threadId !== "string" || typeof createdAt !== "string") continue;

      flattened.push({
        id: `${threadId}:${createdAt}`,
        customer_phone_number: customerPhone,
        tracking_phone_number: trackingNumber,
        text: message["content"],
        created_at: createdAt,
        media_urls: message["media_urls"],
      });
    }
  }

  return flattened;
}

export interface CallRailPollResult {
  callsSeen: number;
  callsCreated: number;
  textsSeen: number;
  textsCreated: number;
  errors: number;
}

/**
 * The polling counterpart to the webhook path (src/app/app/api/webhooks/
 * callrail/route.ts) — kept as the primary way calls/texts reach this app,
 * since CallRail's own webhook delivery couldn't be gotten working
 * reliably from the account's dashboard. Both paths funnel through the
 * exact same processCallWebhook/processMessageWebhook functions, so a call
 * or text is handled identically (matching, notifying, activity logging)
 * regardless of which path found it — and if the webhook ever does start
 * working, or gets configured again later, both can safely run at once:
 * whichever sees an event first wins, the other's insert is a no-op.
 *
 * No-ops (does not throw) if CallRail isn't configured — this must never
 * crash the scheduler tick that also runs processReminders.
 */
export async function pollCallRail<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  now: Date = new Date(),
): Promise<CallRailPollResult | null> {
  const apiKey = process.env.CALLRAIL_API_KEY;
  const accountId = process.env.CALLRAIL_ACCOUNT_ID;
  if (!apiKey || !accountId) return null;

  const startDate = lookbackStartDate(now);
  const result: CallRailPollResult = {
    callsSeen: 0,
    callsCreated: 0,
    textsSeen: 0,
    textsCreated: 0,
    errors: 0,
  };

  let calls: Record<string, unknown>[] = [];
  try {
    calls = await fetchRecentCalls(apiKey, accountId, startDate);
  } catch (error) {
    console.error("CallRail poll: fetching calls failed", error);
    result.errors += 1;
  }

  for (const call of calls) {
    result.callsSeen += 1;
    try {
      const outcome = await processCallWebhook(db, call);
      if (outcome.ok && !outcome.duplicate) result.callsCreated += 1;
    } catch (error) {
      console.error("CallRail poll: processing a call failed", error, call);
      result.errors += 1;
    }
  }

  let conversations: CallRailConversation[] = [];
  try {
    conversations = await fetchRecentTexts(apiKey, accountId, startDate);
  } catch (error) {
    console.error("CallRail poll: fetching texts failed", error);
    result.errors += 1;
  }

  const texts = flattenIncomingTexts(conversations);
  for (const payload of texts) {
    result.textsSeen += 1;
    try {
      const outcome = await processMessageWebhook(db, payload);
      if (outcome.ok && !outcome.duplicate) result.textsCreated += 1;
    } catch (error) {
      console.error("CallRail poll: processing a text failed", error, payload);
      result.errors += 1;
    }
  }

  return result;
}
