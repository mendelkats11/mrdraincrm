import { asc, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { homepageSections } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export type HomepageSectionType =
  "hero" | "services" | "gallery" | "service_areas" | "reviews" | "why_mr_drain" | "cta";

export async function listHomepageSections<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
) {
  return db.select().from(homepageSections).orderBy(asc(homepageSections.sortOrder));
}

export async function listActiveHomepageSections<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
) {
  return db
    .select()
    .from(homepageSections)
    .where(eq(homepageSections.active, true))
    .orderBy(asc(homepageSections.sortOrder));
}

export interface UpdateHomepageSectionInput {
  config?: Record<string, unknown>;
  active?: boolean;
  sortOrder?: number;
}

// Structured sections only — docs/PROJECT_SPEC.md §19.1. This can change
// content/selection/ordering/active state of an existing section row, but
// there is no create/delete here: the 7 section types are fixed, seeded
// once (src/lib/db/seed.ts), and never added to or removed from.
export async function updateHomepageSection<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  sectionId: string,
  input: UpdateHomepageSectionInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(homepageSections)
      .where(eq(homepageSections.id, sectionId));
    if (!before) throw new Error(`Homepage section ${sectionId} not found`);

    const [after] = await tx
      .update(homepageSections)
      .set({ config: input.config, active: input.active, sortOrder: input.sortOrder })
      .where(eq(homepageSections.id, sectionId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "homepage_section",
      entityId: sectionId,
      action: "homepage_section_updated",
      oldValue: { sectionType: before.sectionType, active: before.active },
      newValue: { sectionType: after.sectionType, active: after.active },
    });

    return after;
  });
}
