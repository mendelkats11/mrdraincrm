// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { getCallRailReport } from "@/lib/reports/callrail-report";
import { resolveDateRange } from "@/lib/reports/date-ranges";
import { calls, messages, serviceAreas } from "@/lib/db/schema";

const IN_RANGE = new Date("2026-06-15T18:00:00Z");
const OUT_OF_RANGE = new Date("2026-05-01T18:00:00Z");
const dateRange = resolveDateRange("custom", { start: "2026-06-01", end: "2026-06-30" });

let nextCallId = 1;
async function insertCall(
  db: Awaited<ReturnType<typeof createTestDb>>["db"],
  overrides: Partial<typeof calls.$inferInsert> = {},
) {
  const id = `call-${nextCallId++}`;
  const [row] = await db
    .insert(calls)
    .values({
      callrailCallId: id,
      callerNumber: "+13065551234",
      callerNumberNormalized: "+13065551234",
      trackingNumber: "+13065559999",
      occurredAt: IN_RANGE,
      ...overrides,
    })
    .returning();
  return row;
}

describe("getCallRailReport", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("only includes calls whose occurredAt falls within the date range", async () => {
    const inRange = await insertCall(ctx.db, { occurredAt: IN_RANGE });
    await insertCall(ctx.db, { occurredAt: OUT_OF_RANGE });

    const report = await getCallRailReport(ctx.db, { dateRange });
    expect(report.rows.map((r) => r.callId)).toEqual([inRange.id]);
    expect(report.totalCalls).toBe(1);
  });

  it("counts answered vs missed and matched vs unknown", async () => {
    await insertCall(ctx.db, { answered: true, matched: true });
    await insertCall(ctx.db, { answered: false, matched: false });
    await insertCall(ctx.db, { answered: true, matched: false });

    const report = await getCallRailReport(ctx.db, { dateRange });
    expect(report.totalCalls).toBe(3);
    expect(report.answeredCount).toBe(2);
    expect(report.missedCount).toBe(1);
    expect(report.matchedCount).toBe(1);
    expect(report.unknownCount).toBe(2);
  });

  it("averages duration only over calls that have one", async () => {
    await insertCall(ctx.db, { durationSeconds: 60 });
    await insertCall(ctx.db, { durationSeconds: 120 });
    await insertCall(ctx.db, { durationSeconds: null });

    const report = await getCallRailReport(ctx.db, { dateRange });
    expect(report.averageDurationSeconds).toBe(90);
  });

  it("filters by service area and breaks down calls by area", async () => {
    const [area] = await ctx.db
      .insert(serviceAreas)
      .values({ name: "Stonebridge", slug: "stonebridge" })
      .returning();
    const matching = await insertCall(ctx.db, { serviceAreaId: area.id });
    await insertCall(ctx.db, {});

    const report = await getCallRailReport(ctx.db, { dateRange, serviceAreaId: area.id });
    expect(report.rows.map((r) => r.callId)).toEqual([matching.id]);

    const unfiltered = await getCallRailReport(ctx.db, { dateRange });
    expect(unfiltered.byServiceArea).toContainEqual({ serviceAreaName: "Stonebridge", count: 1 });
    expect(unfiltered.byServiceArea).toContainEqual({
      serviceAreaName: "No tracking number match",
      count: 1,
    });
  });

  it("counts messages in range separately from calls", async () => {
    await ctx.db.insert(messages).values({
      callrailMessageId: "msg-1",
      phoneNumber: "+13065551234",
      phoneNumberNormalized: "+13065551234",
      trackingNumber: "+13065559999",
      occurredAt: IN_RANGE,
    });
    await ctx.db.insert(messages).values({
      callrailMessageId: "msg-2",
      phoneNumber: "+13065551234",
      phoneNumberNormalized: "+13065551234",
      trackingNumber: "+13065559999",
      occurredAt: OUT_OF_RANGE,
    });

    const report = await getCallRailReport(ctx.db, { dateRange });
    expect(report.messageCount).toBe(1);
  });
});
