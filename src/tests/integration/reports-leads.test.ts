// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { createLead, changeLeadStatus } from "@/lib/crm/leads";
import { getLeadsReport } from "@/lib/reports/leads-report";
import { resolveDateRange } from "@/lib/reports/date-ranges";
import { leads } from "@/lib/db/schema";

const IN_RANGE = new Date("2026-06-15T18:00:00Z");
const OUT_OF_RANGE = new Date("2026-05-01T18:00:00Z");
const dateRange = resolveDateRange("custom", { start: "2026-06-01", end: "2026-06-30" });

async function setLeadCreatedAt(
  db: Awaited<ReturnType<typeof createTestDb>>["db"],
  leadId: string,
  createdAt: Date,
) {
  await db.update(leads).set({ createdAt }).where(eq(leads.id, leadId));
}

describe("getLeadsReport", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("only includes leads whose createdAt falls within the date range", async () => {
    const inRange = await createLead(ctx.db, {}, null);
    await setLeadCreatedAt(ctx.db, inRange.id, IN_RANGE);
    const outOfRange = await createLead(ctx.db, {}, null);
    await setLeadCreatedAt(ctx.db, outOfRange.id, OUT_OF_RANGE);

    const report = await getLeadsReport(ctx.db, { dateRange });
    expect(report.rows.map((r) => r.leadId)).toEqual([inRange.id]);
    expect(report.totalCount).toBe(1);
  });

  it("computes a won/total conversion rate", async () => {
    const won = await createLead(ctx.db, {}, null);
    await setLeadCreatedAt(ctx.db, won.id, IN_RANGE);
    await ctx.db.update(leads).set({ status: "won" }).where(eq(leads.id, won.id));

    const lost = await createLead(ctx.db, {}, null);
    await setLeadCreatedAt(ctx.db, lost.id, IN_RANGE);
    await changeLeadStatus(ctx.db, lost.id, "lost", null);

    const stillNew = await createLead(ctx.db, {}, null);
    await setLeadCreatedAt(ctx.db, stillNew.id, IN_RANGE);

    const report = await getLeadsReport(ctx.db, { dateRange });
    expect(report.totalCount).toBe(3);
    expect(report.wonCount).toBe(1);
    expect(report.lostCount).toBe(1);
    expect(report.conversionRateBasisPoints).toBe(Math.round((1 * 10000) / 3));
  });

  it("returns a null conversion rate when there are no leads in range", async () => {
    const report = await getLeadsReport(ctx.db, { dateRange });
    expect(report.conversionRateBasisPoints).toBeNull();
  });

  it("filters by status and by original source", async () => {
    const websiteLead = await createLead(ctx.db, { source: "website" }, null);
    await setLeadCreatedAt(ctx.db, websiteLead.id, IN_RANGE);
    const phoneLead = await createLead(ctx.db, { source: "phone" }, null);
    await setLeadCreatedAt(ctx.db, phoneLead.id, IN_RANGE);

    const sourceFiltered = await getLeadsReport(ctx.db, { dateRange, source: "website" });
    expect(sourceFiltered.rows.map((r) => r.leadId)).toEqual([websiteLead.id]);

    const statusFiltered = await getLeadsReport(ctx.db, { dateRange, status: "new" });
    expect(statusFiltered.totalCount).toBe(2);
  });

  it("breaks down by source, grouping unset sources as Unknown", async () => {
    const a = await createLead(ctx.db, { source: "website" }, null);
    await setLeadCreatedAt(ctx.db, a.id, IN_RANGE);
    const b = await createLead(ctx.db, {}, null);
    await setLeadCreatedAt(ctx.db, b.id, IN_RANGE);

    const report = await getLeadsReport(ctx.db, { dateRange });
    expect(report.bySource).toContainEqual({ source: "website", count: 1 });
    expect(report.bySource).toContainEqual({ source: "Unknown", count: 1 });
  });
});
