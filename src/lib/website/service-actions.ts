"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getStorageProvider } from "@/lib/storage";
import { uploadPublicAsset } from "@/lib/storage/public-asset-upload";
import { createService, updateService } from "./services";

const faqSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(2000),
});

// FAQs are edited as client-side list state (add/remove rows), not native
// form fields, so they arrive as one JSON-encoded string field rather than
// repeated inputs — parsed and validated here rather than trusted as-is.
const faqsJsonSchema = z
  .string()
  .optional()
  .transform((val, ctx) => {
    if (!val) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(val);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid FAQ data." });
      return z.NEVER;
    }
    const result = z.array(faqSchema).max(12).safeParse(parsed);
    if (!result.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid FAQ data." });
      return z.NEVER;
    }
    return result.data;
  });

const serviceFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000).optional(),
  content: z.string().trim().max(8000).optional(),
  faqs: faqsJsonSchema,
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
    content: formData.get("content") || undefined,
    faqs: formData.get("faqs") || undefined,
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
      content: parsed.data.content || null,
      faqs: parsed.data.faqs,
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
    content: formData.get("content") || undefined,
    faqs: formData.get("faqs") || undefined,
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
      content: parsed.data.content || null,
      faqs: parsed.data.faqs,
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

const patchFieldSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
  })
  .strict();

/** The visual editor's click-on-the-text save path for a service's name/
 *  description — same shape and guardrail reasoning as the homepage
 *  editor's patchHomepageSectionConfigAction: a fixed, `.strict()` schema,
 *  so an inline edit can only ever write to a field already given a
 *  defined shape here, never an arbitrary new one. */
export async function patchServiceFieldAction(
  serviceId: string,
  patch: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireUser();
  const parsed = patchFieldSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  if (Object.keys(parsed.data).length === 0) {
    return { ok: false, error: "Nothing to save." };
  }

  const db = getDb();
  await updateService(db, serviceId, parsed.data, session.user.id);
  revalidatePath("/website/services");
  revalidatePath("/website/editor/services");
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

const setImageSchema = z.object({ serviceId: z.string().uuid(), key: z.string().min(1) });

/** Website editor overhaul, phase 1 — sets the image from a key the
 *  MediaPicker already resolved (either an existing library asset or a
 *  freshly uploaded one, which the picker uploads itself), rather than
 *  handling the file upload here the way uploadServiceImageAction below
 *  still does for the moment. */
export async function setServiceImageAction(
  serviceId: string,
  key: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireUser();
  const parsed = setImageSchema.safeParse({ serviceId, key });
  if (!parsed.success) return { ok: false, error: "Invalid image." };

  const db = getDb();
  await updateService(db, parsed.data.serviceId, { imageKey: parsed.data.key }, session.user.id);
  revalidatePath("/website/services");
  revalidatePath("/services");
  return { ok: true };
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
