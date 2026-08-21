// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { getIncludeTaxInRevenue, setIncludeTaxInRevenue } from "@/lib/reports/reporting-settings";
import { appSettings } from "@/lib/db/schema";

describe("reporting settings", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("defaults to true when no settings row exists yet", async () => {
    expect(await getIncludeTaxInRevenue(ctx.db)).toBe(true);
  });

  it("creates the singleton settings row on first write, if none exists", async () => {
    await setIncludeTaxInRevenue(ctx.db, false, null);
    expect(await ctx.db.select().from(appSettings)).toHaveLength(1);
    expect(await getIncludeTaxInRevenue(ctx.db)).toBe(false);
  });

  it("does not create a second row on a later write", async () => {
    await setIncludeTaxInRevenue(ctx.db, false, null);
    await setIncludeTaxInRevenue(ctx.db, true, null);
    expect(await ctx.db.select().from(appSettings)).toHaveLength(1);
    expect(await getIncludeTaxInRevenue(ctx.db)).toBe(true);
  });
});
