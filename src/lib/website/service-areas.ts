import { asc, desc, eq, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { serviceAreas } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { slugify } from "@/lib/db/seed";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export async function listServiceAreasForAdmin<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: { region?: string } = {},
) {
  return db
    .select()
    .from(serviceAreas)
    .where(filters.region ? eq(serviceAreas.region, filters.region) : undefined)
    .orderBy(asc(serviceAreas.sortOrder), desc(serviceAreas.createdAt));
}

/** Distinct configured region values — powers the admin filter dropdown, not a fixed province list (see the region column's comment in the schema). */
export async function listDistinctServiceAreaRegions<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
): Promise<string[]> {
  const rows = await db.selectDistinct({ region: serviceAreas.region }).from(serviceAreas);
  return rows.map((r) => r.region).filter((r): r is string => Boolean(r));
}

export async function listPublishedServiceAreas<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
) {
  return db
    .select()
    .from(serviceAreas)
    .where(eq(serviceAreas.active, true))
    .orderBy(asc(serviceAreas.sortOrder));
}

export async function getServiceAreaBySlug<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  slug: string,
) {
  const [row] = await db
    .select()
    .from(serviceAreas)
    .where(sql`${serviceAreas.slug} = ${slug} AND ${serviceAreas.active} = true`);
  return row ?? null;
}

export async function getServiceArea<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  id: string,
) {
  const [row] = await db.select().from(serviceAreas).where(eq(serviceAreas.id, id));
  return row ?? null;
}

export type ServiceAreaFaq = { question: string; answer: string };

export interface CreateServiceAreaInput {
  name: string;
  copy?: string | null;
  faqs?: ServiceAreaFaq[];
  images?: string[];
  seoTitle?: string | null;
  metaDescription?: string | null;
  callrailTrackingNumber?: string | null;
  region?: string | null;
}

export async function createServiceArea<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: CreateServiceAreaInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [{ maxSort }] = await tx
      .select({ maxSort: sql<number>`coalesce(max(${serviceAreas.sortOrder}), -1)` })
      .from(serviceAreas);

    const base = slugify(input.name);
    let slug = base;
    let suffix = 2;
    while (
      (
        await tx
          .select({ id: serviceAreas.id })
          .from(serviceAreas)
          .where(eq(serviceAreas.slug, slug))
      ).length > 0
    ) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }

    const [area] = await tx
      .insert(serviceAreas)
      .values({
        name: input.name,
        slug,
        copy: input.copy || null,
        faqs: input.faqs ?? [],
        images: input.images ?? [],
        seoTitle: input.seoTitle || null,
        metaDescription: input.metaDescription || null,
        callrailTrackingNumber: input.callrailTrackingNumber || null,
        region: input.region || null,
        sortOrder: maxSort + 1,
      })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "service_area",
      entityId: area.id,
      action: "service_area_created",
      newValue: { name: area.name },
    });

    return area;
  });
}

export interface UpdateServiceAreaInput {
  name?: string;
  copy?: string | null;
  faqs?: ServiceAreaFaq[];
  images?: string[];
  seoTitle?: string | null;
  metaDescription?: string | null;
  callrailTrackingNumber?: string | null;
  region?: string | null;
  active?: boolean;
  sortOrder?: number;
}

export async function updateServiceArea<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  areaId: string,
  input: UpdateServiceAreaInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(serviceAreas).where(eq(serviceAreas.id, areaId));
    if (!before) throw new Error(`Service area ${areaId} not found`);

    const [after] = await tx
      .update(serviceAreas)
      .set({
        name: input.name,
        copy: input.copy !== undefined ? input.copy || null : undefined,
        faqs: input.faqs,
        images: input.images,
        seoTitle: input.seoTitle !== undefined ? input.seoTitle || null : undefined,
        metaDescription:
          input.metaDescription !== undefined ? input.metaDescription || null : undefined,
        callrailTrackingNumber:
          input.callrailTrackingNumber !== undefined
            ? input.callrailTrackingNumber || null
            : undefined,
        region: input.region !== undefined ? input.region || null : undefined,
        active: input.active,
        sortOrder: input.sortOrder,
      })
      .where(eq(serviceAreas.id, areaId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "service_area",
      entityId: areaId,
      action: "service_area_updated",
      oldValue: { name: before.name, active: before.active },
      newValue: { name: after.name, active: after.active },
    });

    return after;
  });
}
