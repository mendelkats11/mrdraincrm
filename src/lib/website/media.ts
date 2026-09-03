import { desc, ilike, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { mediaAssets } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

/** Website editor overhaul, phase 1 — the media library's own list, used by
 *  the MediaPicker across every image field in the CMS. */
export async function listMediaAssets<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: { search?: string } = {},
) {
  return db
    .select()
    .from(mediaAssets)
    .where(filters.search ? ilike(mediaAssets.filename, `%${filters.search}%`) : undefined)
    .orderBy(desc(mediaAssets.createdAt));
}

export interface CreateMediaAssetInput {
  key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export async function createMediaAsset<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: CreateMediaAssetInput,
  actorUserId: string | null,
) {
  const [asset] = await db.insert(mediaAssets).values(input).returning();
  await recordActivity(db, {
    actorUserId,
    entityType: "media_asset",
    entityId: asset.id,
    action: "media_asset_uploaded",
    newValue: { filename: asset.filename },
  });
  return asset;
}

/** Removes the library entry only — deliberately does not delete the
 *  underlying storage object. The library has no record of every place a
 *  key might be referenced (service/service-area/gallery/homepage-section
 *  images all store the key directly, not a foreign key to this table), so
 *  deleting the object itself risks silently breaking a page that still
 *  points at it. Safer to leave an orphaned object in storage than a
 *  broken image on a live page — the safest-reversible-implementation
 *  principle (CLAUDE.md §2) applied to an ambiguous deletion boundary. */
export async function deleteMediaAsset<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  id: string,
  actorUserId: string | null,
) {
  const [deleted] = await db
    .delete(mediaAssets)
    .where(sql`${mediaAssets.id} = ${id}`)
    .returning();
  if (deleted) {
    await recordActivity(db, {
      actorUserId,
      entityType: "media_asset",
      entityId: id,
      action: "media_asset_removed_from_library",
      oldValue: { filename: deleted.filename },
    });
  }
  return deleted ?? null;
}
