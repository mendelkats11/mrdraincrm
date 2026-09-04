"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getStorageProvider } from "@/lib/storage";
import { uploadPublicAsset } from "@/lib/storage/public-asset-upload";
import { updateWebsiteSettings } from "./settings";

const settingsSchema = z.object({
  businessName: z.string().trim().max(200).optional(),
  businessAddress: z.string().trim().max(500).optional(),
  tagline: z.string().trim().max(200).optional(),
  footerTagline: z.string().trim().max(200).optional(),
  aboutHeading: z.string().trim().max(200).optional(),
  aboutBody: z.string().trim().max(3000).optional(),
  publicContactEmail: z.union([z.literal(""), z.string().trim().email()]).optional(),
  defaultCallrailTrackingNumber: z.string().trim().max(32).optional(),
  reviewsPageEnabled: z.boolean(),
  termsOfServiceContent: z.string().trim().max(20000).optional(),
  privacyPolicyContent: z.string().trim().max(20000).optional(),
});

export type WebsiteSettingsFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function updateWebsiteSettingsAction(
  _prevState: WebsiteSettingsFormState,
  formData: FormData,
): Promise<WebsiteSettingsFormState> {
  const session = await requireUser();
  const parsed = settingsSchema.safeParse({
    businessName: formData.get("businessName") || undefined,
    businessAddress: formData.get("businessAddress") || undefined,
    tagline: formData.get("tagline") || undefined,
    footerTagline: formData.get("footerTagline") || undefined,
    aboutHeading: formData.get("aboutHeading") || undefined,
    aboutBody: formData.get("aboutBody") || undefined,
    publicContactEmail: formData.get("publicContactEmail") || undefined,
    defaultCallrailTrackingNumber: formData.get("defaultCallrailTrackingNumber") || undefined,
    reviewsPageEnabled: formData.get("reviewsPageEnabled") === "on",
    termsOfServiceContent: formData.get("termsOfServiceContent") || undefined,
    privacyPolicyContent: formData.get("privacyPolicyContent") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  await updateWebsiteSettings(
    db,
    {
      businessName: parsed.data.businessName || null,
      businessAddress: parsed.data.businessAddress || null,
      tagline: parsed.data.tagline || null,
      footerTagline: parsed.data.footerTagline || null,
      aboutHeading: parsed.data.aboutHeading || null,
      aboutBody: parsed.data.aboutBody || null,
      publicContactEmail: parsed.data.publicContactEmail || null,
      defaultCallrailTrackingNumber: parsed.data.defaultCallrailTrackingNumber || null,
      reviewsPageEnabled: parsed.data.reviewsPageEnabled,
      termsOfServiceContent: parsed.data.termsOfServiceContent || null,
      privacyPolicyContent: parsed.data.privacyPolicyContent || null,
    },
    session.user.id,
  );

  revalidatePath("/website/settings");
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/contact");
  revalidatePath("/reviews");
  revalidatePath("/terms");
  revalidatePath("/privacy");
  return { ok: true };
}

export type BackgroundImageFormState = { ok: true } | { ok: false; error: string } | undefined;

/**
 * Shared by the Contact and Services page background-photo uploaders
 * (Website > Settings) — each is a single optional full-bleed image behind
 * otherwise-plain page content, same upload-or-remove shape as the invoice
 * logo (src/lib/invoices/invoice-actions.ts's uploadInvoiceLogoAction), just
 * targeting a public asset instead of the private invoice-logo bucket key.
 */
async function updateBackgroundImage(
  formData: FormData,
  field: "contactBackgroundImageKey" | "servicesBackgroundImageKey",
  revalidate: string,
): Promise<BackgroundImageFormState> {
  const session = await requireUser();
  const file = formData.get("image");
  const remove = formData.get("remove") === "on";

  let key: string | null | undefined;
  if (file instanceof File && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadPublicAsset(getStorageProvider(), {
      buffer,
      contentType: file.type,
      category: "backgrounds",
    });
    if (!result.ok) return { ok: false, error: result.error };
    key = result.key;
  } else if (remove) {
    key = null;
  } else {
    return { ok: false, error: "Choose an image first." };
  }

  const db = getDb();
  await updateWebsiteSettings(db, { [field]: key }, session.user.id);
  revalidatePath("/website/settings");
  revalidatePath(revalidate);
  return { ok: true };
}

export async function updateContactBackgroundAction(
  _prevState: BackgroundImageFormState,
  formData: FormData,
): Promise<BackgroundImageFormState> {
  return updateBackgroundImage(formData, "contactBackgroundImageKey", "/contact");
}

export async function updateServicesBackgroundAction(
  _prevState: BackgroundImageFormState,
  formData: FormData,
): Promise<BackgroundImageFormState> {
  return updateBackgroundImage(formData, "servicesBackgroundImageKey", "/services");
}

/** Website editor overhaul, phase 2 — sets a background from a key the
 *  MediaPicker already resolved, rather than handling the file upload
 *  here the way updateBackgroundImage above still does for "Remove". */
export async function setBackgroundImageAction(
  field: "contactBackgroundImageKey" | "servicesBackgroundImageKey",
  key: string,
): Promise<BackgroundImageFormState> {
  const session = await requireUser();
  const db = getDb();
  await updateWebsiteSettings(db, { [field]: key }, session.user.id);
  revalidatePath("/website/settings");
  revalidatePath(field === "contactBackgroundImageKey" ? "/contact" : "/services");
  return { ok: true };
}

// Fields the visual editor's click-on-the-text inline editing is allowed to
// write — a fixed allowlist, not "any settings column the caller names",
// since `field` arrives as a plain string from a client component. Extend
// this as more of the site (About page heading/body, footer tagline, etc.)
// gets the same in-context treatment.
const INLINE_SETTINGS_FIELDS = new Set(["tagline"] as const);
type InlineSettingsField = "tagline";

export type PatchSettingsFieldResult = { ok: true } | { ok: false; error: string };

export async function patchWebsiteSettingsFieldAction(
  field: string,
  value: string,
): Promise<PatchSettingsFieldResult> {
  if (!INLINE_SETTINGS_FIELDS.has(field as InlineSettingsField)) {
    return { ok: false, error: "That field can't be edited here." };
  }
  const trimmed = value.trim().slice(0, 200);
  const session = await requireUser();
  const db = getDb();
  await updateWebsiteSettings(db, { [field]: trimmed || null }, session.user.id);
  revalidatePath("/website/editor");
  revalidatePath("/");
  return { ok: true };
}
