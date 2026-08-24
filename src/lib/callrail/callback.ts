import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { appSettings, calls } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { createOutboundCall, CallRailApiError } from "./api-client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export async function getOwnerCallbackPhoneNumber<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
): Promise<string | null> {
  const [settings] = await db.select().from(appSettings).limit(1);
  return settings?.ownerCallbackPhoneNumber ?? null;
}

/** Same find-or-create-the-singleton-row pattern as updateWebsiteSettings (src/lib/website/settings.ts). */
export async function setOwnerCallbackPhoneNumber<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  phoneNumber: string | null,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(appSettings).limit(1);
    const settingsId = existing?.id ?? (await tx.insert(appSettings).values({}).returning())[0].id;

    await tx
      .update(appSettings)
      .set({ ownerCallbackPhoneNumber: phoneNumber || null, updatedAt: new Date() })
      .where(eq(appSettings.id, settingsId));

    await recordActivity(tx, {
      actorUserId,
      entityType: "app_settings",
      entityId: settingsId,
      action: "callback_phone_number_updated",
    });

    return { ok: true as const };
  });
}

export type InitiateCallbackResult =
  | { ok: true; outboundCallrailCallId: string }
  | { ok: false; error: "not_found" | "not_configured" | "api_error"; message?: string };

/**
 * Owner-initiated callback on a missed call — see api-client.ts's
 * createOutboundCall for exactly what CallRail does with these three
 * numbers. Only reads the call, never writes to it: the resulting outbound
 * call arrives back through the normal polling/webhook path
 * (processCallWebhook) like any other CallRail call, so it gets its own
 * row rather than this function trying to predict or pre-create one.
 */
export async function initiateCallback<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  callId: string,
  actorUserId: string | null,
): Promise<InitiateCallbackResult> {
  const [call] = await db.select().from(calls).where(eq(calls.id, callId));
  if (!call) return { ok: false, error: "not_found" };

  const apiKey = process.env.CALLRAIL_API_KEY;
  const accountId = process.env.CALLRAIL_ACCOUNT_ID;
  const businessPhoneNumber = await getOwnerCallbackPhoneNumber(db);
  if (!apiKey || !accountId || !businessPhoneNumber) {
    return {
      ok: false,
      error: "not_configured",
      message: "Set your callback phone number in Settings first.",
    };
  }

  try {
    const outbound = await createOutboundCall(apiKey, accountId, {
      callerId: call.trackingNumber,
      customerPhoneNumber: call.callerNumber,
      businessPhoneNumber,
    });

    await recordActivity(db, {
      actorUserId,
      entityType: "call",
      entityId: call.id,
      action: "callback_initiated",
      newValue: { outboundCallrailCallId: outbound.id },
    });

    return { ok: true, outboundCallrailCallId: outbound.id };
  } catch (error) {
    const message = error instanceof CallRailApiError ? error.message : "Callback failed.";
    return { ok: false, error: "api_error", message };
  }
}
