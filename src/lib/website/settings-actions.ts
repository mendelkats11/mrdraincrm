"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { updateWebsiteSettings } from "./settings";

const settingsSchema = z.object({
  businessName: z.string().trim().max(200).optional(),
  businessAddress: z.string().trim().max(500).optional(),
  tagline: z.string().trim().max(200).optional(),
  aboutHeading: z.string().trim().max(200).optional(),
  aboutBody: z.string().trim().max(3000).optional(),
  publicContactEmail: z.union([z.literal(""), z.string().trim().email()]).optional(),
  defaultCallrailTrackingNumber: z.string().trim().max(32).optional(),
  reviewsPageEnabled: z.boolean(),
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
    aboutHeading: formData.get("aboutHeading") || undefined,
    aboutBody: formData.get("aboutBody") || undefined,
    publicContactEmail: formData.get("publicContactEmail") || undefined,
    defaultCallrailTrackingNumber: formData.get("defaultCallrailTrackingNumber") || undefined,
    reviewsPageEnabled: formData.get("reviewsPageEnabled") === "on",
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
      aboutHeading: parsed.data.aboutHeading || null,
      aboutBody: parsed.data.aboutBody || null,
      publicContactEmail: parsed.data.publicContactEmail || null,
      defaultCallrailTrackingNumber: parsed.data.defaultCallrailTrackingNumber || null,
      reviewsPageEnabled: parsed.data.reviewsPageEnabled,
    },
    session.user.id,
  );

  revalidatePath("/website/settings");
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/contact");
  revalidatePath("/reviews");
  return { ok: true };
}
