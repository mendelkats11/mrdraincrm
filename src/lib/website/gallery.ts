import { and, desc, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { galleryItems } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import type { StorageProvider } from "@/lib/storage";
import { uploadPublicAsset } from "@/lib/storage/public-asset-upload";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export async function listGalleryItemsForAdmin<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
) {
  return db.select().from(galleryItems).orderBy(desc(galleryItems.createdAt));
}

export async function listPublishedGalleryItems<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
) {
  return db
    .select()
    .from(galleryItems)
    .where(eq(galleryItems.hidden, false))
    .orderBy(desc(galleryItems.featured), desc(galleryItems.createdAt));
}

/** Photos tagged to a specific service area in the Gallery admin
 *  (galleryItems.serviceAreaId) — a separate concept from
 *  serviceAreas.images (the hero background, set directly on the area
 *  itself). Shown on that area's public page. */
export async function listPublishedGalleryItemsForServiceArea<
  TQueryResult extends PgQueryResultHKT,
>(db: Db<TQueryResult>, serviceAreaId: string) {
  return db
    .select()
    .from(galleryItems)
    .where(and(eq(galleryItems.hidden, false), eq(galleryItems.serviceAreaId, serviceAreaId)))
    .orderBy(desc(galleryItems.featured), desc(galleryItems.createdAt));
}

export interface UploadGalleryItemInput {
  buffer: Buffer;
  contentType: string;
  caption?: string | null;
  serviceId?: string | null;
  serviceAreaId?: string | null;
  beforeAfter?: "before" | "after" | "na";
}

export type UploadGalleryItemResult = { ok: true; itemId: string } | { ok: false; error: string };

/** Real photos only, per docs/DESIGN_SYSTEM.md §3 ("do not invent fake job
 *  imagery") — this is purely a storage+DB operation, the honesty
 *  constraint is enforced by what the owner chooses to upload, not by
 *  this function. */
export async function uploadGalleryItem<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  storage: StorageProvider,
  input: UploadGalleryItemInput,
  actorUserId: string | null,
): Promise<UploadGalleryItemResult> {
  const uploadResult = await uploadPublicAsset(storage, {
    buffer: input.buffer,
    contentType: input.contentType,
    category: "gallery",
  });
  if (!uploadResult.ok) return uploadResult;

  return db.transaction(async (tx) => {
    const [item] = await tx
      .insert(galleryItems)
      .values({
        storageKey: uploadResult.key,
        caption: input.caption || null,
        serviceId: input.serviceId || null,
        serviceAreaId: input.serviceAreaId || null,
        beforeAfter: input.beforeAfter ?? "na",
      })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "gallery_item",
      entityId: item.id,
      action: "gallery_item_uploaded",
      newValue: { caption: item.caption },
    });

    return { ok: true, itemId: item.id };
  });
}

export interface UpdateGalleryItemInput {
  caption?: string | null;
  serviceId?: string | null;
  serviceAreaId?: string | null;
  beforeAfter?: "before" | "after" | "na";
  featured?: boolean;
  hidden?: boolean;
}

export async function updateGalleryItem<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  itemId: string,
  input: UpdateGalleryItemInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(galleryItems).where(eq(galleryItems.id, itemId));
    if (!before) throw new Error(`Gallery item ${itemId} not found`);

    const [after] = await tx
      .update(galleryItems)
      .set({
        caption: input.caption !== undefined ? input.caption || null : undefined,
        serviceId: input.serviceId !== undefined ? input.serviceId || null : undefined,
        serviceAreaId: input.serviceAreaId !== undefined ? input.serviceAreaId || null : undefined,
        beforeAfter: input.beforeAfter,
        featured: input.featured,
        hidden: input.hidden,
      })
      .where(eq(galleryItems.id, itemId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "gallery_item",
      entityId: itemId,
      action: "gallery_item_updated",
      oldValue: { featured: before.featured, hidden: before.hidden },
      newValue: { featured: after.featured, hidden: after.hidden },
    });

    return after;
  });
}

/** Real delete, not archive — gallery items are marketing/CMS content, not
 *  a financial or business-transaction record (docs/CLAUDE.md §6's
 *  archive-not-delete rule applies to those, not to this), matching the
 *  precedent already set by job photo deletion. */
export async function deleteGalleryItem<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  storage: StorageProvider,
  itemId: string,
  actorUserId: string | null,
): Promise<void> {
  const removed = await db.transaction(async (tx) => {
    const [row] = await tx.delete(galleryItems).where(eq(galleryItems.id, itemId)).returning();
    if (!row) return null;

    await recordActivity(tx, {
      actorUserId,
      entityType: "gallery_item",
      entityId: itemId,
      action: "gallery_item_deleted",
      oldValue: { caption: row.caption },
    });

    return row;
  });

  if (!removed) return;

  try {
    await storage.delete(removed.storageKey);
  } catch (error) {
    console.error(
      `Failed to delete R2 object ${removed.storageKey} for gallery item ${itemId}:`,
      error,
    );
  }
}
