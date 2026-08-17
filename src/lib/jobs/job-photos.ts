import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { jobPhotoCategoryEnum, jobPhotos } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import type { StorageProvider } from "@/lib/storage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export type JobPhotoCategory = (typeof jobPhotoCategoryEnum.enumValues)[number];

export interface UploadJobPhotoInput {
  buffer: Buffer;
  contentType: string;
  category: JobPhotoCategory;
  caption?: string | null;
}

/**
 * `storage` is passed in explicitly (rather than calling getStorageProvider()
 * internally) so this stays testable with a fake in-memory provider, the
 * same dependency-injection shape every `db`-taking function in this
 * codebase already uses. Uploads to R2 first, then records the row — if the
 * upload throws, nothing is written to the database, so a photo row can
 * never reference an object that doesn't actually exist. Private by
 * default: nothing here produces a public URL, only listJobPhotos' short-
 * lived signed ones (docs/ARCHITECTURE.md §11/§28).
 */
export async function uploadJobPhoto<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  storage: StorageProvider,
  jobId: string,
  input: UploadJobPhotoInput,
  actorUserId: string | null,
) {
  const id = randomUUID();
  const extension = input.contentType.split("/")[1] || "bin";
  const storageKey = `jobs/${jobId}/${id}.${extension}`;

  await storage.upload({
    key: storageKey,
    body: input.buffer,
    contentType: input.contentType,
  });

  return db.transaction(async (tx) => {
    const [photo] = await tx
      .insert(jobPhotos)
      .values({
        id,
        jobId,
        storageKey,
        category: input.category,
        caption: input.caption || null,
      })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "job",
      entityId: jobId,
      action: "job_photo_uploaded",
      newValue: { category: input.category },
    });

    return photo;
  });
}

export interface JobPhotoWithUrl {
  id: string;
  category: JobPhotoCategory;
  caption: string | null;
  uploadedAt: Date;
  signedUrl: string;
}

export async function listJobPhotos<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  storage: StorageProvider,
  jobId: string,
): Promise<JobPhotoWithUrl[]> {
  const rows = await db
    .select()
    .from(jobPhotos)
    .where(eq(jobPhotos.jobId, jobId))
    .orderBy(asc(jobPhotos.uploadedAt));

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      category: row.category,
      caption: row.caption,
      uploadedAt: row.uploadedAt,
      signedUrl: await storage.getSignedUrl(row.storageKey),
    })),
  );
}

/**
 * Removes the database row first — if that fails, the photo remains fully
 * intact and visible. Only once the row is gone do we best-effort delete
 * the R2 object; a failure there leaves an orphaned object (wasted storage,
 * never user-visible) rather than a broken reference to a missing file.
 */
export async function deleteJobPhoto<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  storage: StorageProvider,
  jobId: string,
  photoId: string,
  actorUserId: string | null,
): Promise<void> {
  const [removed] = await db.delete(jobPhotos).where(eq(jobPhotos.id, photoId)).returning();

  if (!removed || removed.jobId !== jobId) return;

  await recordActivity(db, {
    actorUserId,
    entityType: "job",
    entityId: jobId,
    action: "job_photo_deleted",
    oldValue: { category: removed.category },
  });

  try {
    await storage.delete(removed.storageKey);
  } catch (error) {
    console.error(`Failed to delete R2 object ${removed.storageKey} for photo ${photoId}:`, error);
  }
}

export async function recategorizeJobPhoto<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
  photoId: string,
  category: JobPhotoCategory,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(jobPhotos).where(eq(jobPhotos.id, photoId));
    if (!before || before.jobId !== jobId)
      throw new Error(`Photo ${photoId} not found on job ${jobId}`);

    const [after] = await tx
      .update(jobPhotos)
      .set({ category })
      .where(eq(jobPhotos.id, photoId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "job",
      entityId: jobId,
      action: "job_photo_recategorized",
      oldValue: { category: before.category },
      newValue: { category: after.category },
    });

    return after;
  });
}
