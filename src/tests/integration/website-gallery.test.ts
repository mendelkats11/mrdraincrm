// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { FakeStorageProvider } from "../helpers/fake-storage";
import {
  deleteGalleryItem,
  listPublishedGalleryItems,
  updateGalleryItem,
  uploadGalleryItem,
} from "@/lib/website/gallery";
import { galleryItems } from "@/lib/db/schema";

describe("website gallery", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let storage: FakeStorageProvider;

  beforeEach(async () => {
    ctx = await createTestDb();
    storage = new FakeStorageProvider();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("uploads to storage under public-assets/gallery/ and writes the DB row", async () => {
    const result = await uploadGalleryItem(
      ctx.db,
      storage,
      { buffer: Buffer.from("x"), contentType: "image/jpeg", caption: "Nice job" },
      null,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");

    const rows = await ctx.db.select().from(galleryItems);
    expect(rows).toHaveLength(1);
    expect(rows[0].storageKey).toMatch(/^public-assets\/gallery\/.+\.jpeg$/);
    expect(rows[0].caption).toBe("Nice job");
  });

  it("rejects a disallowed content type without writing a DB row", async () => {
    const result = await uploadGalleryItem(
      ctx.db,
      storage,
      { buffer: Buffer.from("x"), contentType: "application/pdf" },
      null,
    );
    expect(result.ok).toBe(false);
    expect(await ctx.db.select().from(galleryItems)).toHaveLength(0);
  });

  it("listPublishedGalleryItems excludes hidden items", async () => {
    const shown = await uploadGalleryItem(
      ctx.db,
      storage,
      { buffer: Buffer.from("x"), contentType: "image/jpeg" },
      null,
    );
    const hidden = await uploadGalleryItem(
      ctx.db,
      storage,
      { buffer: Buffer.from("x"), contentType: "image/jpeg" },
      null,
    );
    if (!shown.ok || !hidden.ok) throw new Error("expected ok");
    await updateGalleryItem(ctx.db, hidden.itemId, { hidden: true }, null);

    const rows = await listPublishedGalleryItems(ctx.db);
    expect(rows.map((r) => r.id)).toEqual([shown.itemId]);
  });

  it("deleteGalleryItem removes the DB row and the storage object", async () => {
    const result = await uploadGalleryItem(
      ctx.db,
      storage,
      { buffer: Buffer.from("x"), contentType: "image/png" },
      null,
    );
    if (!result.ok) throw new Error("expected ok");
    expect(storage.objects.size).toBe(1);

    await deleteGalleryItem(ctx.db, storage, result.itemId, null);

    expect(await ctx.db.select().from(galleryItems)).toHaveLength(0);
    expect(storage.objects.size).toBe(0);
  });
});
