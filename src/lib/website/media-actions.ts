"use server";

import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getStorageProvider } from "@/lib/storage";
import { uploadPublicAsset } from "@/lib/storage/public-asset-upload";
import { createMediaAsset, deleteMediaAsset, listMediaAssets } from "./media";

export type MediaActionResult =
  { ok: true; key: string; filename: string } | { ok: false; error: string };

/** Uploads a file straight into the media library (not tied to any one
 *  service/area/section) — the MediaPicker's own "Upload new" action. */
export async function uploadMediaAssetAction(formData: FormData): Promise<MediaActionResult> {
  const session = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image first." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadResult = await uploadPublicAsset(getStorageProvider(), {
    buffer,
    contentType: file.type,
    category: "media",
  });
  if (!uploadResult.ok) return { ok: false, error: uploadResult.error };

  const db = getDb();
  await createMediaAsset(
    db,
    {
      key: uploadResult.key,
      filename: file.name || "Untitled",
      contentType: file.type,
      sizeBytes: file.size,
    },
    session.user.id,
  );

  return { ok: true, key: uploadResult.key, filename: file.name || "Untitled" };
}

const deleteSchema = z.object({ id: z.string().uuid() });

export async function deleteMediaAssetAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireUser();
  const parsed = deleteSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: "Invalid asset." };

  const db = getDb();
  await deleteMediaAsset(db, parsed.data.id, session.user.id);
  return { ok: true };
}

/** Server action the MediaPicker calls (client component) to load/search
 *  the library — a plain async function works here without a form/formData
 *  wrapper since it only reads. */
export async function searchMediaAssetsAction(search?: string) {
  await requireUser();
  const db = getDb();
  const rows = await listMediaAssets(db, { search });
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    filename: r.filename,
    contentType: r.contentType,
    sizeBytes: r.sizeBytes,
    createdAt: r.createdAt.toISOString(),
  }));
}
