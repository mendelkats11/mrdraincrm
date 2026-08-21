// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import { FakeStorageProvider } from "../helpers/fake-storage";
import { createJob } from "@/lib/jobs/jobs";
import {
  deleteJobPhoto,
  listJobPhotos,
  recategorizeJobPhoto,
  uploadJobPhoto,
} from "@/lib/jobs/job-photos";
import { activities, jobPhotos, sequences } from "@/lib/db/schema";

async function seedJobSequence(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  await db.insert(sequences).values({ name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 });
}

describe("job photos", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let storage: FakeStorageProvider;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
    storage = new FakeStorageProvider();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("uploads to storage before writing the database row", async () => {
    const job = await createJob(ctx.db, {}, null);
    const photo = await uploadJobPhoto(
      ctx.db,
      storage,
      job.id,
      { buffer: Buffer.from("fake-image-bytes"), contentType: "image/jpeg", category: "before" },
      null,
    );

    expect(storage.objects.size).toBe(1);
    const [stored] = [...storage.objects.values()];
    expect(stored.contentType).toBe("image/jpeg");
    expect(photo.category).toBe("before");
    expect(photo.storageKey).toContain(job.id);
  });

  it("does not write a database row if the upload fails", async () => {
    const job = await createJob(ctx.db, {}, null);
    const failingStorage = new FakeStorageProvider();
    failingStorage.upload = async () => {
      throw new Error("simulated upload failure");
    };

    await expect(
      uploadJobPhoto(
        ctx.db,
        failingStorage,
        job.id,
        { buffer: Buffer.from("x"), contentType: "image/jpeg", category: "other" },
        null,
      ),
    ).rejects.toThrow("simulated upload failure");

    const rows = await ctx.db.select().from(jobPhotos).where(eq(jobPhotos.jobId, job.id));
    expect(rows).toHaveLength(0);
  });

  it("records a job_photo_uploaded activity", async () => {
    const job = await createJob(ctx.db, {}, null);
    await uploadJobPhoto(
      ctx.db,
      storage,
      job.id,
      { buffer: Buffer.from("x"), contentType: "image/png", category: "after" },
      null,
    );
    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "job"), eq(activities.entityId, job.id)));
    expect(rows.map((r) => r.action)).toContain("job_photo_uploaded");
  });

  it("lists photos with freshly generated signed URLs", async () => {
    const job = await createJob(ctx.db, {}, null);
    await uploadJobPhoto(
      ctx.db,
      storage,
      job.id,
      { buffer: Buffer.from("x"), contentType: "image/jpeg", category: "during" },
      null,
    );

    const photos = await listJobPhotos(ctx.db, storage, job.id);
    expect(photos).toHaveLength(1);
    expect(photos[0].signedUrl).toContain("signed=1");
    expect(photos[0].category).toBe("during");
  });

  it("supports all four categories", async () => {
    const job = await createJob(ctx.db, {}, null);
    for (const category of ["before", "during", "after", "other"] as const) {
      await uploadJobPhoto(
        ctx.db,
        storage,
        job.id,
        { buffer: Buffer.from("x"), contentType: "image/jpeg", category },
        null,
      );
    }
    const photos = await listJobPhotos(ctx.db, storage, job.id);
    expect(photos.map((p) => p.category).sort()).toEqual(["after", "before", "during", "other"]);
  });

  it("deletes the database row and the storage object", async () => {
    const job = await createJob(ctx.db, {}, null);
    const photo = await uploadJobPhoto(
      ctx.db,
      storage,
      job.id,
      { buffer: Buffer.from("x"), contentType: "image/jpeg", category: "other" },
      null,
    );

    await deleteJobPhoto(ctx.db, storage, job.id, photo.id, null);

    const rows = await ctx.db.select().from(jobPhotos).where(eq(jobPhotos.id, photo.id));
    expect(rows).toHaveLength(0);
    expect(storage.objects.size).toBe(0);
    expect(storage.deletedKeys).toContain(photo.storageKey);
  });

  it("records a job_photo_deleted activity alongside the delete, in the same transaction", async () => {
    const job = await createJob(ctx.db, {}, null);
    const photo = await uploadJobPhoto(
      ctx.db,
      storage,
      job.id,
      { buffer: Buffer.from("x"), contentType: "image/jpeg", category: "other" },
      null,
    );

    await deleteJobPhoto(ctx.db, storage, job.id, photo.id, null);

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "job"),
          eq(activities.entityId, job.id),
          eq(activities.action, "job_photo_deleted"),
        ),
      );
    expect(rows).toHaveLength(1);
  });

  it("does not delete the photo (or record activity) when the given jobId doesn't match the photo's actual job", async () => {
    const job = await createJob(ctx.db, {}, null);
    const otherJob = await createJob(ctx.db, {}, null);
    const photo = await uploadJobPhoto(
      ctx.db,
      storage,
      job.id,
      { buffer: Buffer.from("x"), contentType: "image/jpeg", category: "other" },
      null,
    );

    // Same photoId, wrong jobId — must be a safe no-op, not a bypass that
    // deletes the row while merely skipping the audit trail.
    await deleteJobPhoto(ctx.db, storage, otherJob.id, photo.id, null);

    const rows = await ctx.db.select().from(jobPhotos).where(eq(jobPhotos.id, photo.id));
    expect(rows).toHaveLength(1);
    expect(storage.objects.size).toBe(1);

    const activityRows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "job"), eq(activities.action, "job_photo_deleted")));
    expect(activityRows).toHaveLength(0);
  });

  it("removing the database row survives a storage delete failure (orphan, not breakage)", async () => {
    const job = await createJob(ctx.db, {}, null);
    const photo = await uploadJobPhoto(
      ctx.db,
      storage,
      job.id,
      { buffer: Buffer.from("x"), contentType: "image/jpeg", category: "other" },
      null,
    );
    storage.delete = async () => {
      throw new Error("simulated R2 outage");
    };

    await expect(deleteJobPhoto(ctx.db, storage, job.id, photo.id, null)).resolves.toBeUndefined();

    const rows = await ctx.db.select().from(jobPhotos).where(eq(jobPhotos.id, photo.id));
    expect(rows).toHaveLength(0);
  });

  it("recategorizes a photo and records before/after", async () => {
    const job = await createJob(ctx.db, {}, null);
    const photo = await uploadJobPhoto(
      ctx.db,
      storage,
      job.id,
      { buffer: Buffer.from("x"), contentType: "image/jpeg", category: "before" },
      null,
    );

    await recategorizeJobPhoto(ctx.db, job.id, photo.id, "after", null);

    const [row] = await ctx.db.select().from(jobPhotos).where(eq(jobPhotos.id, photo.id));
    expect(row.category).toBe("after");

    const activityRows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "job"),
          eq(activities.entityId, job.id),
          eq(activities.action, "job_photo_recategorized"),
        ),
      );
    expect(activityRows).toHaveLength(1);
    expect(activityRows[0].oldValue).toMatchObject({ category: "before" });
    expect(activityRows[0].newValue).toMatchObject({ category: "after" });
  });
});
