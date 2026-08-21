"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getStorageProvider } from "@/lib/storage";
import { deleteJobPhoto, recategorizeJobPhoto, uploadJobPhoto } from "./job-photos";

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10MB

const categorySchema = z.enum(["before", "during", "after", "other"]);

export type SimpleFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function uploadJobPhotoAction(
  _prevState: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const session = await requireUser();

  const jobIdField = formData.get("jobId");
  const category = categorySchema.safeParse(formData.get("category"));
  const caption = formData.get("caption");
  const file = formData.get("file");

  const jobIdParsed = z.string().uuid().safeParse(jobIdField);
  if (!jobIdParsed.success) {
    return { ok: false, error: "Invalid job." };
  }
  const jobId = jobIdParsed.data;
  if (!category.success) {
    return { ok: false, error: "Choose a photo category." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a photo to upload." };
  }
  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    return { ok: false, error: "Only JPEG, PNG, WebP, or HEIC photos are supported." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Photo is too large (10MB max)." };
  }

  const db = getDb();
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadJobPhoto(
    db,
    getStorageProvider(),
    jobId,
    {
      buffer,
      contentType: file.type,
      category: category.data,
      caption: typeof caption === "string" ? caption || null : null,
    },
    session.user.id,
  );

  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

export async function deleteJobPhotoAction(jobId: string, photoId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await deleteJobPhoto(db, getStorageProvider(), jobId, photoId, session.user.id);
  revalidatePath(`/jobs/${jobId}`);
}

const recategorizeSchema = z.object({
  jobId: z.string().uuid(),
  photoId: z.string().uuid(),
  category: categorySchema,
});

export async function recategorizeJobPhotoAction(
  jobId: string,
  photoId: string,
  category: string,
): Promise<SimpleFormState> {
  const session = await requireUser();
  const parsed = recategorizeSchema.safeParse({ jobId, photoId, category });
  if (!parsed.success) {
    return { ok: false, error: "Invalid category." };
  }

  const db = getDb();
  await recategorizeJobPhoto(
    db,
    parsed.data.jobId,
    parsed.data.photoId,
    parsed.data.category,
    session.user.id,
  );
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}
