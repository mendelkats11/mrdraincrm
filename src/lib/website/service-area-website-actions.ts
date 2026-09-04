"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getStorageProvider } from "@/lib/storage";
import { uploadPublicAsset } from "@/lib/storage/public-asset-upload";
import { createServiceArea, getServiceArea, updateServiceArea } from "./service-areas";

// Named "*-website-actions" (not "service-area-actions") to avoid colliding
// with src/lib/callrail/service-area-actions.ts, the earlier, narrower
// tracking-number-only editor (Phase 13) — both now touch overlapping
// fields on the same serviceAreas row (this one is the full CMS editor),
// which is a small, harmless redundancy rather than a conflict; the
// tracking-number page is left as-is per "don't rewrite working features
// without a clear reason."

const areaFaqSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(2000),
});

// FAQs are edited as client-side list state (add/remove rows), not native
// form fields — same pattern as src/lib/website/service-actions.ts.
const areaFaqsJsonSchema = z
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
    const result = z.array(areaFaqSchema).max(12).safeParse(parsed);
    if (!result.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid FAQ data." });
      return z.NEVER;
    }
    return result.data;
  });

const areaFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  copy: z.string().trim().max(3000).optional(),
  faqs: areaFaqsJsonSchema,
  seoTitle: z.string().trim().max(200).optional(),
  metaDescription: z.string().trim().max(300).optional(),
  callrailTrackingNumber: z.string().trim().max(32).optional(),
  region: z.string().trim().max(50).optional(),
});

export type ServiceAreaFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function createServiceAreaAction(
  _prevState: ServiceAreaFormState,
  formData: FormData,
): Promise<ServiceAreaFormState> {
  const session = await requireUser();
  const parsed = areaFieldsSchema.safeParse({
    name: formData.get("name"),
    copy: formData.get("copy") || undefined,
    faqs: formData.get("faqs") || undefined,
    seoTitle: formData.get("seoTitle") || undefined,
    metaDescription: formData.get("metaDescription") || undefined,
    callrailTrackingNumber: formData.get("callrailTrackingNumber") || undefined,
    region: formData.get("region") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  await createServiceArea(
    db,
    {
      name: parsed.data.name,
      copy: parsed.data.copy || null,
      faqs: parsed.data.faqs,
      seoTitle: parsed.data.seoTitle || null,
      metaDescription: parsed.data.metaDescription || null,
      callrailTrackingNumber: parsed.data.callrailTrackingNumber || null,
      region: parsed.data.region || null,
    },
    session.user.id,
  );

  revalidatePath("/website/service-areas");
  revalidatePath("/service-areas");
  return { ok: true };
}

const updateAreaSchema = areaFieldsSchema.extend({
  areaId: z.string().uuid(),
  active: z.string().optional(),
});

export async function updateServiceAreaAction(
  _prevState: ServiceAreaFormState,
  formData: FormData,
): Promise<ServiceAreaFormState> {
  const session = await requireUser();
  const parsed = updateAreaSchema.safeParse({
    areaId: formData.get("areaId"),
    name: formData.get("name"),
    copy: formData.get("copy") || undefined,
    faqs: formData.get("faqs") || undefined,
    seoTitle: formData.get("seoTitle") || undefined,
    metaDescription: formData.get("metaDescription") || undefined,
    callrailTrackingNumber: formData.get("callrailTrackingNumber") || undefined,
    region: formData.get("region") || undefined,
    active: formData.get("active") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  await updateServiceArea(
    db,
    parsed.data.areaId,
    {
      name: parsed.data.name,
      copy: parsed.data.copy || null,
      faqs: parsed.data.faqs,
      seoTitle: parsed.data.seoTitle || null,
      metaDescription: parsed.data.metaDescription || null,
      callrailTrackingNumber: parsed.data.callrailTrackingNumber || null,
      region: parsed.data.region || null,
      active: parsed.data.active === "on",
    },
    session.user.id,
  );

  revalidatePath("/website/service-areas");
  revalidatePath("/service-areas");
  return { ok: true };
}

const patchFieldSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    copy: z.string().trim().max(3000).optional(),
  })
  .strict();

/** The visual editor's click-on-the-text save path for a service area's
 *  name/description — same shape and guardrail reasoning as
 *  service-actions.ts's patchServiceFieldAction. */
export async function patchServiceAreaFieldAction(
  areaId: string,
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
  await updateServiceArea(db, areaId, parsed.data, session.user.id);
  revalidatePath("/website/service-areas");
  revalidatePath("/website/editor/service-areas");
  revalidatePath("/service-areas");
  return { ok: true };
}

export async function setServiceAreaActiveAction(areaId: string, active: boolean): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await updateServiceArea(db, areaId, { active }, session.user.id);
  revalidatePath("/website/service-areas");
  revalidatePath("/service-areas");
}

/** Website editor overhaul, phase 2 — appends an image the MediaPicker
 *  already resolved, same effect as uploadServiceAreaImageAction below but
 *  without re-uploading a file that's already in the library. */
export async function addServiceAreaImageAction(
  areaId: string,
  key: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireUser();
  if (!z.string().uuid().safeParse(areaId).success) {
    return { ok: false, error: "Invalid service area." };
  }

  const db = getDb();
  const area = await getServiceArea(db, areaId);
  const images = [...(area?.images ?? []), key];
  await updateServiceArea(db, areaId, { images }, session.user.id);

  revalidatePath("/website/service-areas");
  revalidatePath("/service-areas");
  return { ok: true };
}

export async function uploadServiceAreaImageAction(
  _prevState: ServiceAreaFormState,
  formData: FormData,
): Promise<ServiceAreaFormState> {
  const session = await requireUser();
  const areaId = formData.get("areaId");
  const file = formData.get("image");
  if (typeof areaId !== "string" || !z.string().uuid().safeParse(areaId).success) {
    return { ok: false, error: "Invalid service area." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image first." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadResult = await uploadPublicAsset(getStorageProvider(), {
    buffer,
    contentType: file.type,
    category: "service-areas",
  });
  if (!uploadResult.ok) return { ok: false, error: uploadResult.error };

  const db = getDb();
  const area = await getServiceArea(db, areaId);
  const images = [...(area?.images ?? []), uploadResult.key];
  await updateServiceArea(db, areaId, { images }, session.user.id);

  revalidatePath("/website/service-areas");
  revalidatePath("/service-areas");
  return { ok: true };
}

/** images[0] is the cover/hero image shown on the service-area listing and detail pages (src/app/(site)/service-areas/{page.tsx,[slug]/page.tsx}) — "cover" is just "first in the array," not a separate stored field. */
export async function setServiceAreaCoverImageAction(areaId: string, key: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  const area = await getServiceArea(db, areaId);
  if (!area) return;
  const images = [key, ...area.images.filter((existing) => existing !== key)];
  await updateServiceArea(db, areaId, { images }, session.user.id);
  revalidatePath("/website/service-areas");
  revalidatePath("/service-areas");
}

export async function removeServiceAreaImageAction(areaId: string, key: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  const area = await getServiceArea(db, areaId);
  if (!area) return;
  const images = area.images.filter((existing) => existing !== key);
  await updateServiceArea(db, areaId, { images }, session.user.id);
  revalidatePath("/website/service-areas");
  revalidatePath("/service-areas");
}
