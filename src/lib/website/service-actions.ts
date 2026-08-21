"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getStorageProvider } from "@/lib/storage";
import { uploadPublicAsset } from "@/lib/storage/public-asset-upload";
import { createService, updateService } from "./services";

const serviceFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000).optional(),
  seoTitle: z.string().trim().max(200).optional(),
  metaDescription: z.string().trim().max(300).optional(),
});

export type ServiceFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function createServiceAction(
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const session = await requireUser();
  const parsed = serviceFieldsSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    seoTitle: formData.get("seoTitle") || undefined,
    metaDescription: formData.get("metaDescription") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  await createService(
    db,
    {
      name: parsed.data.name,
      description: parsed.data.description || null,
      seoTitle: parsed.data.seoTitle || null,
      metaDescription: parsed.data.metaDescription || null,
    },
    session.user.id,
  );

  revalidatePath("/website/services");
  revalidatePath("/services");
  return { ok: true };
}

const updateServiceSchema = serviceFieldsSchema.extend({
  serviceId: z.string().uuid(),
  active: z.string().optional(),
});

export async function updateServiceAction(
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const session = await requireUser();
  const parsed = updateServiceSchema.safeParse({
    serviceId: formData.get("serviceId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    seoTitle: formData.get("seoTitle") || undefined,
    metaDescription: formData.get("metaDescription") || undefined,
    active: formData.get("active") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  await updateService(
    db,
    parsed.data.serviceId,
    {
      name: parsed.data.name,
      description: parsed.data.description || null,
      seoTitle: parsed.data.seoTitle || null,
      metaDescription: parsed.data.metaDescription || null,
      active: parsed.data.active === "on",
    },
    session.user.id,
  );

  revalidatePath("/website/services");
  revalidatePath("/services");
  return { ok: true };
}

export async function setServiceActiveAction(serviceId: string, active: boolean): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await updateService(db, serviceId, { active }, session.user.id);
  revalidatePath("/website/services");
  revalidatePath("/services");
}

export async function uploadServiceImageAction(
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const session = await requireUser();
  const serviceId = formData.get("serviceId");
  const file = formData.get("image");
  if (typeof serviceId !== "string" || !z.string().uuid().safeParse(serviceId).success) {
    return { ok: false, error: "Invalid service." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image first." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadResult = await uploadPublicAsset(getStorageProvider(), {
    buffer,
    contentType: file.type,
    category: "services",
  });
  if (!uploadResult.ok) return { ok: false, error: uploadResult.error };

  const db = getDb();
  await updateService(db, serviceId, { imageKey: uploadResult.key }, session.user.id);

  revalidatePath("/website/services");
  revalidatePath("/services");
  return { ok: true };
}
