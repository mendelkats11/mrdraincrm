import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { verifyCallRailWebhookSecret } from "@/lib/callrail/auth";
import { processCallWebhook, processMessageWebhook } from "@/lib/callrail/calls";

// Placed under src/app/app/api (not src/app/api) — Phase 8 found that the
// app-host proxy rewrites every request to /app/<path>, so a route outside
// that tree 404s in production. This path is also explicitly allowlisted
// in src/proxy.ts's PUBLIC_ON_APP_HOST_PREFIXES, since CallRail's own
// server calling this has no session cookie — it authenticates via
// CALLRAIL_WEBHOOK_SECRET instead (verifyCallRailWebhookSecret), checked
// below before anything else runs.
//
// CallRail can be configured to send both call and SMS events to the same
// URL; there's no single universally-documented field that distinguishes
// them across every CallRail plan, so this checks for message-shaped
// fields (text/body/message) first and falls back to treating the payload
// as a call event — matches CallRail's own most common configuration.
function isMessagePayload(payload: Record<string, unknown>): boolean {
  const type = payload["type"] ?? payload["event_type"] ?? payload["message_type"];
  if (typeof type === "string") return /sms|text|message/i.test(type);
  return "text" in payload || "body" in payload || "message" in payload;
}

export async function POST(request: NextRequest) {
  if (!verifyCallRailWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = getDb();
  const record = payload as Record<string, unknown>;

  const result = isMessagePayload(record)
    ? await processMessageWebhook(db, record)
    : await processCallWebhook(db, record);

  if (!result.ok) {
    // Logged server-side only — never expose payload/internal detail in the
    // response, matching the /api/leads precedent for a public endpoint.
    console.error("CallRail webhook: unparseable payload", record);
    // Still 200: this isn't CallRail's fault to retry, there's nothing
    // recognizable in the payload for us to process differently next time.
    return NextResponse.json({ ok: true, processed: false });
  }

  return NextResponse.json({ ok: true, duplicate: result.duplicate });
}
