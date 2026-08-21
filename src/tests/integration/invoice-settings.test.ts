// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import {
  getInvoiceTemplateSettings,
  updateInvoiceTemplateSettings,
} from "@/lib/invoices/invoice-settings";
import { activities, appSettings } from "@/lib/db/schema";

describe("getInvoiceTemplateSettings", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("returns curated defaults when no appSettings row exists yet", async () => {
    const settings = await getInvoiceTemplateSettings(ctx.db);
    expect(settings.logoKey).toBeNull();
    expect(settings.accentColor).toBe("#1e3a5f");
    expect(settings.fontFamily).toBe("Helvetica");
  });
});

describe("updateInvoiceTemplateSettings", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates the singleton appSettings row on first use", async () => {
    await updateInvoiceTemplateSettings(ctx.db, { logoKey: "settings/logo/a.png" }, null);
    const rows = await ctx.db.select().from(appSettings);
    expect(rows).toHaveLength(1);
    expect(rows[0].logoKey).toBe("settings/logo/a.png");
  });

  it("updates only the fields provided, leaving the rest untouched", async () => {
    await updateInvoiceTemplateSettings(
      ctx.db,
      { logoKey: "settings/logo/a.png", accentColor: "#065f46" },
      null,
    );
    await updateInvoiceTemplateSettings(ctx.db, { fontFamily: "Times-Roman" }, null);

    const settings = await getInvoiceTemplateSettings(ctx.db);
    expect(settings.logoKey).toBe("settings/logo/a.png");
    expect(settings.accentColor).toBe("#065f46");
    expect(settings.fontFamily).toBe("Times-Roman");
  });

  it("records an invoice_template_updated activity with old/new values", async () => {
    await updateInvoiceTemplateSettings(ctx.db, { accentColor: "#0f766e" }, null);

    const [settingsRow] = await ctx.db.select().from(appSettings);
    const rows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "app_settings"),
          eq(activities.entityId, settingsRow.id),
          eq(activities.action, "invoice_template_updated"),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(rows[0].newValue).toMatchObject({ accentColor: "#0f766e" });
  });
});
