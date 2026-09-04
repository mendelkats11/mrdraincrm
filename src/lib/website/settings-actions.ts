"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getStorageProvider } from "@/lib/storage";
import { uploadPublicAsset } from "@/lib/storage/public-asset-upload";
import { updateWebsiteSettings } from "./settings";

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
// write, each with its own max length — a fixed allowlist, not "any
// settings column the caller names," since `field` arrives as a plain
// string from a client component. The map's keys are what
// patchWebsiteSettingsFieldAction actually accepts; the length limits match
// updateWebsiteSettingsAction's zod schema above so the two save paths
// can't disagree on what's valid.
const INLINE_SETTINGS_FIELD_LIMITS = {
  businessName: 200,
  businessAddress: 500,
  tagline: 200,
  footerTagline: 200,
  publicContactEmail: 320,
  defaultCallrailTrackingNumber: 32,
  aboutHeading: 200,
  aboutBody: 3000,
  termsOfServiceContent: 20000,
  privacyPolicyContent: 20000,
} as const;
type InlineSettingsField = keyof typeof INLINE_SETTINGS_FIELD_LIMITS;

export type PatchSettingsFieldResult = { ok: true } | { ok: false; error: string };

export async function patchWebsiteSettingsFieldAction(
  field: string,
  value: string,
): Promise<PatchSettingsFieldResult> {
  const limit = INLINE_SETTINGS_FIELD_LIMITS[field as InlineSettingsField];
  if (limit === undefined) {
    return { ok: false, error: "That field can't be edited here." };
  }
  const trimmed = value.trim().slice(0, limit);
  if (field === "publicContactEmail" && trimmed && !z.string().email().safeParse(trimmed).success) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const session = await requireUser();
  const db = getDb();
  await updateWebsiteSettings(db, { [field]: trimmed || null }, session.user.id);
  revalidatePath("/website/editor/settings");
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/contact");
  revalidatePath("/terms");
  revalidatePath("/privacy");
  return { ok: true };
}

export async function setReviewsPageEnabledAction(enabled: boolean): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await updateWebsiteSettings(db, { reviewsPageEnabled: enabled }, session.user.id);
  revalidatePath("/website/editor/settings");
  revalidatePath("/");
}
