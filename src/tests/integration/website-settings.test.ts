// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { getWebsiteSettings, updateWebsiteSettings } from "@/lib/website/settings";
import { appSettings } from "@/lib/db/schema";

describe("website settings", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("returns all-null defaults when no appSettings row exists", async () => {
    const settings = await getWebsiteSettings(ctx.db);
    expect(settings).toEqual({
      businessName: null,
      businessAddress: null,
      tagline: null,
      aboutHeading: null,
      aboutBody: null,
      publicContactEmail: null,
      defaultCallrailTrackingNumber: null,
    });
  });

  it("creates the singleton row on first use", async () => {
    await updateWebsiteSettings(ctx.db, { tagline: "Fast, honest plumbing" }, null);
    const rows = await ctx.db.select().from(appSettings);
    expect(rows).toHaveLength(1);
    expect(rows[0].tagline).toBe("Fast, honest plumbing");
  });

  it("updates only the fields provided, leaving the rest untouched", async () => {
    await updateWebsiteSettings(ctx.db, { tagline: "First", publicContactEmail: "a@b.com" }, null);
    await updateWebsiteSettings(ctx.db, { aboutHeading: "About us" }, null);

    const settings = await getWebsiteSettings(ctx.db);
    expect(settings.tagline).toBe("First");
    expect(settings.publicContactEmail).toBe("a@b.com");
    expect(settings.aboutHeading).toBe("About us");
  });
});
