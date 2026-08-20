// CallRail's webhook payload shape, mapped defensively — Phase 11
// decision. CallRail's dashboard lets you attach custom fields/placeholders
// to an outbound webhook, and the exact key names can vary by account
// configuration; the full raw payload is always preserved in
// webhook_log.payload regardless of what this parser recognizes, so a
// wrong guess here loses nothing and can be corrected/replayed later once
// real payloads are observed from the owner's actual CallRail account.

export interface ParsedCallEvent {
  callrailCallId: string;
  callerNumber: string;
  trackingNumber: string;
  answered: boolean;
  durationSeconds: number | null;
  occurredAt: Date;
}

export interface ParsedMessageEvent {
  callrailMessageId: string;
  phoneNumber: string;
  trackingNumber: string;
  body: string | null;
  mediaUrls: string[];
  occurredAt: Date;
}

function firstString(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstNumber(payload: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function firstBoolean(payload: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "boolean") return value;
    if (value === "true" || value === "yes") return true;
    if (value === "false" || value === "no") return false;
  }
  return null;
}

function firstDate(payload: Record<string, unknown>, keys: string[]): Date {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return new Date();
}

/** Returns null if the payload is missing an identifiable call ID or caller number — nothing usable to process. */
export function parseCallWebhookPayload(payload: Record<string, unknown>): ParsedCallEvent | null {
  const callrailCallId = firstString(payload, ["id", "call_id", "callrail_call_id"]);
  const callerNumber = firstString(payload, [
    "customer_phone_number",
    "caller_id",
    "caller_number",
    "customer_number",
  ]);
  if (!callrailCallId || !callerNumber) return null;

  const trackingNumber =
    firstString(payload, ["tracking_phone_number", "tracking_number", "callercountry"]) ??
    "unknown";

  return {
    callrailCallId,
    callerNumber,
    trackingNumber,
    answered: firstBoolean(payload, ["answered"]) ?? true,
    durationSeconds: firstNumber(payload, ["duration", "duration_seconds", "call_duration"]),
    occurredAt: firstDate(payload, ["start_time", "datetime", "created_at", "timestamp"]),
  };
}

/** Returns null if the payload is missing an identifiable message ID or phone number. */
export function parseMessageWebhookPayload(
  payload: Record<string, unknown>,
): ParsedMessageEvent | null {
  const callrailMessageId = firstString(payload, ["id", "message_id", "callrail_message_id"]);
  const phoneNumber = firstString(payload, [
    "customer_phone_number",
    "caller_id",
    "caller_number",
    "customer_number",
  ]);
  if (!callrailMessageId || !phoneNumber) return null;

  const trackingNumber =
    firstString(payload, ["tracking_phone_number", "tracking_number"]) ?? "unknown";

  const mediaRaw = payload["media_urls"] ?? payload["mms_media"];
  const mediaUrls = Array.isArray(mediaRaw)
    ? mediaRaw.filter((m): m is string => typeof m === "string")
    : [];

  return {
    callrailMessageId,
    phoneNumber,
    trackingNumber,
    body: firstString(payload, ["text", "body", "message"]),
    mediaUrls,
    occurredAt: firstDate(payload, ["datetime", "created_at", "timestamp"]),
  };
}
