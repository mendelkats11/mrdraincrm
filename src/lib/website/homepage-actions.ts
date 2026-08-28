"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getStorageProvider } from "@/lib/storage";
import { uploadPublicAsset } from "@/lib/storage/public-asset-upload";
import { updateHomepageSection } from "./homepage";

export type HomepageSectionFormState = { ok: true } | { ok: false; error: string } | undefined;

const pointFieldSchema = z.string().trim().max(200).optional();

const configSchema = z.object({
  sectionId: z.string().uuid(),
  active: z.string().optional(),
  limit: z.string().trim().optional(),
  heading: z.string().trim().max(200).optional(),
  body: z.string().trim().max(2000).optional(),
  // why_mr_drain's 4 points — see PointFields in why-mr-drain-section.tsx
  // for the fixed icon each index pairs with; title/body are the only
  // editable parts, matching the section's other text fields above.
  point1Title: pointFieldSchema,
  point1Body: pointFieldSchema,
  point2Title: pointFieldSchema,
  point2Body: pointFieldSchema,
  point3Title: pointFieldSchema,
  point3Body: pointFieldSchema,
  point4Title: pointFieldSchema,
  point4Body: pointFieldSchema,
});

/** One form per section on the homepage editor — `limit` only means
 *  anything for the services/gallery/service_areas/reviews section types
 *  (how many items to show), heading/body only for why_mr_drain/cta. Each
 *  section stores only the keys relevant to its own type; unused keys are
 *  simply left out of `config` rather than written as empty strings. */
export async function updateHomepageSectionAction(
  _prevState: HomepageSectionFormState,
  formData: FormData,
): Promise<HomepageSectionFormState> {
  const session = await requireUser();
  const parsed = configSchema.safeParse({
    sectionId: formData.get("sectionId"),
    active: formData.get("active") || undefined,
    limit: formData.get("limit") || undefined,
    heading: formData.get("heading") || undefined,
    body: formData.get("body") || undefined,
    point1Title: formData.get("point1Title") || undefined,
    point1Body: formData.get("point1Body") || undefined,
    point2Title: formData.get("point2Title") || undefined,
    point2Body: formData.get("point2Body") || undefined,
    point3Title: formData.get("point3Title") || undefined,
    point3Body: formData.get("point3Body") || undefined,
    point4Title: formData.get("point4Title") || undefined,
    point4Body: formData.get("point4Body") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const config: Record<string, unknown> = {};
  if (parsed.data.limit) {
    const limitNum = Number(parsed.data.limit);
    if (Number.isFinite(limitNum) && limitNum > 0) config.limit = Math.floor(limitNum);
  }
  if (parsed.data.heading) config.heading = parsed.data.heading;
  if (parsed.data.body) config.body = parsed.data.body;

  // Always write all 4 slots (never drop one just because it's blank) so a
  // partial edit can't collapse the array down to fewer than 4 points —
  // WhyMrDrainSection falls back to its own default title/body per slot
  // wherever a slot's field is missing.
  const points = ([1, 2, 3, 4] as const).map((n) => ({
    title: parsed.data[`point${n}Title` as const],
    body: parsed.data[`point${n}Body` as const],
  }));
  if (points.some((p) => p.title || p.body)) config.points = points;

  // Hero collage photos — file inputs aren't part of configSchema (zod
  // string parsing doesn't fit File), handled directly against formData.
  // Each of the 3 slots independently: a newly uploaded file replaces it,
  // "remove" clears it, otherwise the existing key (carried via a hidden
  // field, since this form has no server-side read of the current row)
  // is kept as-is.
  const storage = getStorageProvider();
  const photoKeys: string[] = [];
  for (const n of [1, 2, 3] as const) {
    const file = formData.get(`photo${n}`);
    const existingKey = formData.get(`existingPhoto${n}Key`);
    const remove = formData.get(`removePhoto${n}`) === "on";

    if (file instanceof File && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadPublicAsset(storage, {
        buffer,
        contentType: file.type,
        category: "hero",
      });
      if (!result.ok) return { ok: false, error: result.error };
      photoKeys.push(result.key);
    } else if (!remove && typeof existingKey === "string" && existingKey) {
      photoKeys.push(existingKey);
    }
  }
  if (photoKeys.length > 0) config.photoKeys = photoKeys;

  const db = getDb();
  await updateHomepageSection(
    db,
    parsed.data.sectionId,
    { config, active: parsed.data.active === "on" },
    session.user.id,
  );

  revalidatePath("/website/homepage");
  revalidatePath("/");
  return { ok: true };
}

export async function reorderHomepageSectionAction(
  sectionId: string,
  sortOrder: number,
): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await updateHomepageSection(db, sectionId, { sortOrder }, session.user.id);
  revalidatePath("/website/homepage");
  revalidatePath("/");
}
