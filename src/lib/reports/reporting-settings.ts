import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { appSettings } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export async function getIncludeTaxInRevenue<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
): Promise<boolean> {
  const [settings] = await db.select().from(appSettings).limit(1);
  return settings?.includeTaxInRevenue ?? true;
}

/** Same find-or-create-the-singleton-row pattern as updateWebsiteSettings
 *  (src/lib/website/settings.ts) — appSettings has no guaranteed seed row. */
export async function setIncludeTaxInRevenue<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  includeTaxInRevenue: boolean,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(appSettings).limit(1);
    const settingsId = existing?.id ?? (await tx.insert(appSettings).values({}).returning())[0].id;

    await tx
      .update(appSettings)
      .set({ includeTaxInRevenue, updatedAt: new Date() })
      .where(eq(appSettings.id, settingsId));

    await recordActivity(tx, {
      actorUserId,
      entityType: "app_settings",
      entityId: settingsId,
      action: "reporting_settings_updated",
      newValue: { includeTaxInRevenue },
    });

    return { ok: true as const };
  });
}
