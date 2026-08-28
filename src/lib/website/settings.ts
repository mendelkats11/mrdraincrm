import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { appSettings } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export interface WebsiteSettings {
  businessName: string | null;
  businessAddress: string | null;
  tagline: string | null;
  footerTagline: string | null;
  aboutHeading: string | null;
  aboutBody: string | null;
  publicContactEmail: string | null;
  defaultCallrailTrackingNumber: string | null;
  reviewsPageEnabled: boolean;
}

export async function getWebsiteSettings<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
): Promise<WebsiteSettings> {
  const [settings] = await db.select().from(appSettings).limit(1);
  return {
    businessName: settings?.businessName ?? null,
    businessAddress: settings?.businessAddress ?? null,
    tagline: settings?.tagline ?? null,
    footerTagline: settings?.footerTagline ?? null,
    aboutHeading: settings?.aboutHeading ?? null,
    aboutBody: settings?.aboutBody ?? null,
    publicContactEmail: settings?.publicContactEmail ?? null,
    defaultCallrailTrackingNumber: settings?.defaultCallrailTrackingNumber ?? null,
    reviewsPageEnabled: settings?.reviewsPageEnabled ?? false,
  };
}

export interface UpdateWebsiteSettingsInput {
  businessName?: string | null;
  businessAddress?: string | null;
  tagline?: string | null;
  footerTagline?: string | null;
  aboutHeading?: string | null;
  aboutBody?: string | null;
  publicContactEmail?: string | null;
  defaultCallrailTrackingNumber?: string | null;
  reviewsPageEnabled?: boolean;
}

/** Same find-or-create-the-singleton-row pattern as
 *  updateInvoiceTemplateSettings (src/lib/invoices/invoice-settings.ts) —
 *  appSettings is a true DB-level singleton, but this app has no
 *  guaranteed seed in every environment. */
export async function updateWebsiteSettings<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: UpdateWebsiteSettingsInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(appSettings).limit(1);
    const settingsId = existing?.id ?? (await tx.insert(appSettings).values({}).returning())[0].id;

    await tx
      .update(appSettings)
      .set({
        businessName: input.businessName !== undefined ? input.businessName || null : undefined,
        businessAddress:
          input.businessAddress !== undefined ? input.businessAddress || null : undefined,
        tagline: input.tagline !== undefined ? input.tagline || null : undefined,
        footerTagline: input.footerTagline !== undefined ? input.footerTagline || null : undefined,
        aboutHeading: input.aboutHeading !== undefined ? input.aboutHeading || null : undefined,
        aboutBody: input.aboutBody !== undefined ? input.aboutBody || null : undefined,
        publicContactEmail:
          input.publicContactEmail !== undefined ? input.publicContactEmail || null : undefined,
        defaultCallrailTrackingNumber:
          input.defaultCallrailTrackingNumber !== undefined
            ? input.defaultCallrailTrackingNumber || null
            : undefined,
        reviewsPageEnabled:
          input.reviewsPageEnabled !== undefined ? input.reviewsPageEnabled : undefined,
        updatedAt: new Date(),
      })
      .where(eq(appSettings.id, settingsId));

    await recordActivity(tx, {
      actorUserId,
      entityType: "app_settings",
      entityId: settingsId,
      action: "website_settings_updated",
    });

    return { ok: true as const };
  });
}
