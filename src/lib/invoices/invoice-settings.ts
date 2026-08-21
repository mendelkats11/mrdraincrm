import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { appSettings } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { resolveAccentColor, resolveFontFamily } from "@/lib/pdf/invoice-template";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export interface InvoiceTemplateSettings {
  logoKey: string | null;
  accentColor: string;
  fontFamily: string;
}

export async function getInvoiceTemplateSettings<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
): Promise<InvoiceTemplateSettings> {
  const [settings] = await db.select().from(appSettings).limit(1);
  return {
    logoKey: settings?.logoKey ?? null,
    accentColor: resolveAccentColor(settings?.invoiceAccentColor),
    fontFamily: resolveFontFamily(settings?.invoiceFontFamily),
  };
}

export interface UpdateInvoiceTemplateSettingsInput {
  logoKey?: string | null;
  accentColor?: string;
  fontFamily?: string;
}

/**
 * The logo/accent-color/font-family default every *new* invoice snapshots
 * from at creation time — this is the business-wide brand identity, one
 * setting shared across all invoices, not something re-configured per
 * document (matching how businessName/businessAddress already work).
 * appSettings is a true singleton (docs/db/schema/system.ts) but this app
 * has no seed/settings-creation guarantee in every environment, so this
 * creates the row on first use rather than assuming one already exists.
 */
export async function updateInvoiceTemplateSettings<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: UpdateInvoiceTemplateSettingsInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(appSettings).limit(1);
    const settingsId = existing?.id ?? (await tx.insert(appSettings).values({}).returning())[0].id;

    const before = {
      logoKey: existing?.logoKey ?? null,
      accentColor: resolveAccentColor(existing?.invoiceAccentColor),
      fontFamily: resolveFontFamily(existing?.invoiceFontFamily),
    };

    await tx
      .update(appSettings)
      .set({
        logoKey: input.logoKey !== undefined ? input.logoKey : undefined,
        invoiceAccentColor:
          input.accentColor !== undefined ? resolveAccentColor(input.accentColor) : undefined,
        invoiceFontFamily:
          input.fontFamily !== undefined ? resolveFontFamily(input.fontFamily) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(appSettings.id, settingsId));

    await recordActivity(tx, {
      actorUserId,
      entityType: "app_settings",
      entityId: settingsId,
      action: "invoice_template_updated",
      oldValue: before,
      newValue: {
        logoKey: input.logoKey !== undefined ? input.logoKey : before.logoKey,
        accentColor:
          input.accentColor !== undefined
            ? resolveAccentColor(input.accentColor)
            : before.accentColor,
        fontFamily:
          input.fontFamily !== undefined ? resolveFontFamily(input.fontFamily) : before.fontFamily,
      },
    });

    return { ok: true as const };
  });
}
