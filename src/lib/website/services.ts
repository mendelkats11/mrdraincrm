import { asc, desc, eq, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { services } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { slugify } from "@/lib/db/seed";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export async function listServicesForAdmin<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
) {
  return db.select().from(services).orderBy(asc(services.sortOrder), desc(services.createdAt));
}

export async function listPublishedServices<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
) {
  return db
    .select()
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.sortOrder));
}

export async function getServiceBySlug<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  slug: string,
) {
  const [row] = await db
    .select()
    .from(services)
    .where(sql`${services.slug} = ${slug} AND ${services.active} = true`);
  return row ?? null;
}

export async function getService<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  id: string,
) {
  const [row] = await db.select().from(services).where(eq(services.id, id));
  return row ?? null;
}

/** Unique-slug generation shared by create paths across all Website CMS
 *  entities that key off a name (services, service areas) — appends
 *  -2, -3, ... only if the base slug is already taken. */
async function uniqueSlug<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  name: string,
  checkExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  while (await checkExists(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export interface CreateServiceInput {
  name: string;
  description?: string | null;
  imageKey?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
}

export async function createService<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: CreateServiceInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [{ maxSort }] = await tx
      .select({ maxSort: sql<number>`coalesce(max(${services.sortOrder}), -1)` })
      .from(services);
    const slug = await uniqueSlug(tx, input.name, async (candidate) => {
      const [existing] = await tx
        .select({ id: services.id })
        .from(services)
        .where(eq(services.slug, candidate));
      return Boolean(existing);
    });

    const [service] = await tx
      .insert(services)
      .values({
        name: input.name,
        slug,
        description: input.description || null,
        imageKey: input.imageKey || null,
        seoTitle: input.seoTitle || null,
        metaDescription: input.metaDescription || null,
        sortOrder: maxSort + 1,
      })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "service",
      entityId: service.id,
      action: "service_created",
      newValue: { name: service.name },
    });

    return service;
  });
}

export interface UpdateServiceInput {
  name?: string;
  description?: string | null;
  imageKey?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  active?: boolean;
  sortOrder?: number;
}

export async function updateService<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  serviceId: string,
  input: UpdateServiceInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(services).where(eq(services.id, serviceId));
    if (!before) throw new Error(`Service ${serviceId} not found`);

    const [after] = await tx
      .update(services)
      .set({
        name: input.name,
        description: input.description !== undefined ? input.description || null : undefined,
        imageKey: input.imageKey !== undefined ? input.imageKey || null : undefined,
        seoTitle: input.seoTitle !== undefined ? input.seoTitle || null : undefined,
        metaDescription:
          input.metaDescription !== undefined ? input.metaDescription || null : undefined,
        active: input.active,
        sortOrder: input.sortOrder,
      })
      .where(eq(services.id, serviceId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "service",
      entityId: serviceId,
      action: "service_updated",
      oldValue: { name: before.name, active: before.active },
      newValue: { name: after.name, active: after.active },
    });

    return after;
  });
}
