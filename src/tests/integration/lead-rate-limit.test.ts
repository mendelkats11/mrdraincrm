// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { recordActivity } from "@/lib/audit/activity";
import {
  LEAD_SUBMISSION_ATTEMPT_ACTION,
  LEAD_SUBMISSION_IP_ENTITY_TYPE,
  LEAD_SUBMISSION_MAX_ATTEMPTS,
  countRecentLeadSubmissions,
  deterministicIdFrom,
} from "@/lib/auth/rate-limit";

describe("countRecentLeadSubmissions", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("counts recent attempts for one IP and ignores other IPs", async () => {
    const ipA = deterministicIdFrom("203.0.113.1");
    const ipB = deterministicIdFrom("203.0.113.2");

    for (let i = 0; i < 3; i++) {
      await recordActivity(ctx.db, {
        entityType: LEAD_SUBMISSION_IP_ENTITY_TYPE,
        entityId: ipA,
        action: LEAD_SUBMISSION_ATTEMPT_ACTION,
      });
    }
    await recordActivity(ctx.db, {
      entityType: LEAD_SUBMISSION_IP_ENTITY_TYPE,
      entityId: ipB,
      action: LEAD_SUBMISSION_ATTEMPT_ACTION,
    });

    expect(await countRecentLeadSubmissions(ctx.db, ipA)).toBe(3);
    expect(await countRecentLeadSubmissions(ctx.db, ipB)).toBe(1);
  });

  it("reaching the max attempts is what the route handler treats as rate-limited", async () => {
    const ip = deterministicIdFrom("203.0.113.5");
    for (let i = 0; i < LEAD_SUBMISSION_MAX_ATTEMPTS; i++) {
      await recordActivity(ctx.db, {
        entityType: LEAD_SUBMISSION_IP_ENTITY_TYPE,
        entityId: ip,
        action: LEAD_SUBMISSION_ATTEMPT_ACTION,
      });
    }
    expect(await countRecentLeadSubmissions(ctx.db, ip)).toBe(LEAD_SUBMISSION_MAX_ATTEMPTS);
  });
});
