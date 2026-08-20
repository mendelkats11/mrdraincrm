import { asc, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { serviceAreas } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

/**
 * Just the tracking-number field, not general service-area content editing
 * (name/copy/images/SEO) — that's the Website CMS, docs/ROADMAP.md Phase
 * 15, out of scope here. "Tracking numbers are editable from the
 * service-area configuration" (docs/PROJECT_SPEC.md §16) is this phase's
 * own explicit requirement, so this is the smallest UI that satisfies it.
 */
export async function listServiceAreasForTrackingConfig<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
) {
  return db
    .select({
      id: serviceAreas.id,
      name: serviceAreas.name,
      callrailTrackingNumber: serviceAreas.callrailTrackingNumber,
    })
    .from(serviceAreas)
    .orderBy(asc(serviceAreas.sortOrder));
}

export type UpdateTrackingNumberResult = { ok: true } | { ok: false; error: "not_found" };

export async function updateServiceAreaTrackingNumber<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  serviceAreaId: string,
  trackingNumber: string | null,
  actorUserId: string | null,
): Promise<UpdateTrackingNumberResult> {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(serviceAreas).where(eq(serviceAreas.id, serviceAreaId));
    if (!before) return { ok: false, error: "not_found" };

    await tx
      .update(serviceAreas)
      .set({ callrailTrackingNumber: trackingNumber })
      .where(eq(serviceAreas.id, serviceAreaId));

    await recordActivity(tx, {
      actorUserId,
      entityType: "service_area",
      entityId: serviceAreaId,
      action: "service_area_tracking_number_updated",
      oldValue: { callrailTrackingNumber: before.callrailTrackingNumber },
      newValue: { callrailTrackingNumber: trackingNumber },
    });

    return { ok: true };
  });
}
