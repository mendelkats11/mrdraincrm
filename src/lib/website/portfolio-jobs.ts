import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { portfolioJobs } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { slugify } from "@/lib/db/seed";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export async function listPortfolioJobsForAdmin<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
) {
  return db
    .select()
    .from(portfolioJobs)
    .orderBy(asc(portfolioJobs.sortOrder), desc(portfolioJobs.createdAt));
}

export async function listPublishedPortfolioJobs<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
) {
  return db
    .select()
    .from(portfolioJobs)
    .where(eq(portfolioJobs.hidden, false))
    .orderBy(desc(portfolioJobs.featured), asc(portfolioJobs.sortOrder));
}

/** Shown on a service-area's public page — same "tagged to this area"
 *  concept galleryItems.serviceAreaId used to serve, now at the job level. */
export async function listPublishedPortfolioJobsForServiceArea<
  TQueryResult extends PgQueryResultHKT,
>(db: Db<TQueryResult>, serviceAreaId: string) {
  return db
    .select()
    .from(portfolioJobs)
    .where(and(eq(portfolioJobs.hidden, false), eq(portfolioJobs.serviceAreaId, serviceAreaId)))
    .orderBy(desc(portfolioJobs.featured), asc(portfolioJobs.sortOrder));
}

export async function getPortfolioJobBySlug<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  slug: string,
) {
  const [row] = await db
    .select()
    .from(portfolioJobs)
    .where(and(eq(portfolioJobs.slug, slug), eq(portfolioJobs.hidden, false)));
  return row ?? null;
}

export async function getPortfolioJob<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  id: string,
) {
  const [row] = await db.select().from(portfolioJobs).where(eq(portfolioJobs.id, id));
  return row ?? null;
}

/** Same shared-pattern unique-slug generation as services/service areas
 *  (see services.ts's private uniqueSlug) — reimplemented locally since
 *  that copy isn't exported from there. */
async function uniqueSlug<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  title: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(title) || "job";
  let candidate = base;
  let suffix = 2;
  for (;;) {
    const [existing] = await db
      .select({ id: portfolioJobs.id })
      .from(portfolioJobs)
      .where(eq(portfolioJobs.slug, candidate));
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export interface CreatePortfolioJobInput {
  title: string;
  coverImageKey: string;
  description?: string | null;
  serviceId?: string | null;
  serviceAreaId?: string | null;
  featured?: boolean;
}

export async function createPortfolioJob<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: CreatePortfolioJobInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [{ maxSort }] = await tx
      .select({ maxSort: sql<number>`coalesce(max(${portfolioJobs.sortOrder}), -1)` })
      .from(portfolioJobs);
    const slug = await uniqueSlug(tx, input.title);

    const [job] = await tx
      .insert(portfolioJobs)
      .values({
        title: input.title,
        slug,
        description: input.description || null,
        coverImageKey: input.coverImageKey,
        serviceId: input.serviceId || null,
        serviceAreaId: input.serviceAreaId || null,
        featured: input.featured ?? false,
        sortOrder: maxSort + 1,
      })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "portfolio_job",
      entityId: job.id,
      action: "portfolio_job_created",
      newValue: { title: job.title },
    });

    return job;
  });
}

export interface UpdatePortfolioJobInput {
  title?: string;
  description?: string | null;
  coverImageKey?: string;
  serviceId?: string | null;
  serviceAreaId?: string | null;
  featured?: boolean;
  hidden?: boolean;
  sortOrder?: number;
}

export async function updatePortfolioJob<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
  input: UpdatePortfolioJobInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(portfolioJobs).where(eq(portfolioJobs.id, jobId));
    if (!before) throw new Error(`Portfolio job ${jobId} not found`);

    // A title edit doesn't touch the slug — the slug is the job's URL, and
    // changing it out from under an already-published/indexed/shared page
    // would silently break that link. A slug is set once, at creation.
    const [after] = await tx
      .update(portfolioJobs)
      .set({
        title: input.title,
        description: input.description !== undefined ? input.description || null : undefined,
        coverImageKey: input.coverImageKey,
        serviceId: input.serviceId !== undefined ? input.serviceId || null : undefined,
        serviceAreaId: input.serviceAreaId !== undefined ? input.serviceAreaId || null : undefined,
        featured: input.featured,
        hidden: input.hidden,
        sortOrder: input.sortOrder,
      })
      .where(eq(portfolioJobs.id, jobId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "portfolio_job",
      entityId: jobId,
      action: "portfolio_job_updated",
      oldValue: { title: before.title, hidden: before.hidden },
      newValue: { title: after.title, hidden: after.hidden },
    });

    return after;
  });
}

/** Real delete, not archive — same reasoning as deleteGalleryItem: this is
 *  marketing/CMS content, not a financial or business-transaction record,
 *  so docs/CLAUDE.md §6's archive-not-delete rule doesn't apply. The cover
 *  photo's underlying storage object is intentionally left alone (it's a
 *  media-library asset, potentially reused elsewhere — deleting it here
 *  would be a surprising side effect a job deletion shouldn't have). */
export async function deletePortfolioJob<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
  actorUserId: string | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [removed] = await tx.delete(portfolioJobs).where(eq(portfolioJobs.id, jobId)).returning();
    if (!removed) return;

    await recordActivity(tx, {
      actorUserId,
      entityType: "portfolio_job",
      entityId: jobId,
      action: "portfolio_job_deleted",
      oldValue: { title: removed.title },
    });
  });
}
