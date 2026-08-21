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

export async function uploadGalleryItemAction(
  _prevState: GalleryFormState,
  formData: FormData,
): Promise<GalleryFormState> {
  const session = await requireUser();
  const file = formData.get("image");
  const captionField = formData.get("caption");
  const serviceIdField = uuidOrEmpty.safeParse(formData.get("serviceId") || undefined);
  const serviceAreaIdField = uuidOrEmpty.safeParse(formData.get("serviceAreaId") || undefined);
  const beforeAfterField = beforeAfterSchema.safeParse(formData.get("beforeAfter") || "na");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a photo first." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const db = getDb();
  const result = await uploadGalleryItem(
    db,
    getStorageProvider(),
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
