"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getStorageProvider } from "@/lib/storage";
import { deleteGalleryItem, updateGalleryItem, uploadGalleryItem } from "./gallery";

const beforeAfterSchema = z.enum(["before", "after", "na"]);

export type GalleryFormState = { ok: true } | { ok: false; error: string } | undefined;

const uuidOrEmpty = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

/**
 * Accepts one or more files under the same "image" field (the form's file
 * input has the `multiple` attribute) — every selected photo gets the same
 * shared caption/before-after/service/area, uploaded as separate gallery
 * items. Stops at the first failure rather than silently skipping it, so a
 * bad file in the batch is never lost without the owner knowing.
 */
export async function uploadGalleryItemAction(
  _prevState: GalleryFormState,
  formData: FormData,
): Promise<GalleryFormState> {
  const session = await requireUser();
  const files = formData.getAll("image").filter((f): f is File => f instanceof File && f.size > 0);
  const captionField = formData.get("caption");
  const serviceIdField = uuidOrEmpty.safeParse(formData.get("serviceId") || undefined);
  const serviceAreaIdField = uuidOrEmpty.safeParse(formData.get("serviceAreaId") || undefined);
  const beforeAfterField = beforeAfterSchema.safeParse(formData.get("beforeAfter") || "na");

  if (files.length === 0) {
    return { ok: false, error: "Choose at least one photo first." };
  }

  const db = getDb();
  const storage = getStorageProvider();
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadGalleryItem(
      db,
      storage,
      {
        buffer,
        contentType: file.type,
        caption: typeof captionField === "string" ? captionField || null : null,
        serviceId: serviceIdField.success ? (serviceIdField.data ?? null) : null,
        serviceAreaId: serviceAreaIdField.success ? (serviceAreaIdField.data ?? null) : null,
        beforeAfter: beforeAfterField.success ? beforeAfterField.data : "na",
      },
      session.user.id,
    );
    if (!result.ok) return result;
  }

  revalidatePath("/website/gallery");
  revalidatePath("/gallery");
  revalidatePath("/");
  return { ok: true };
}

export async function setGalleryItemFeaturedAction(
  itemId: string,
  featured: boolean,
): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await updateGalleryItem(db, itemId, { featured }, session.user.id);
  revalidatePath("/website/gallery");
  revalidatePath("/gallery");
  revalidatePath("/");
}

export async function setGalleryItemHiddenAction(itemId: string, hidden: boolean): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await updateGalleryItem(db, itemId, { hidden }, session.user.id);
  revalidatePath("/website/gallery");
  revalidatePath("/gallery");
  revalidatePath("/");
}

export async function deleteGalleryItemAction(itemId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await deleteGalleryItem(db, getStorageProvider(), itemId, session.user.id);
  revalidatePath("/website/gallery");
  revalidatePath("/gallery");
  revalidatePath("/");
}
