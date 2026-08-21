// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { notifyActiveUsers, listNotificationsForUser } from "@/lib/notifications/notifications";
import { users } from "@/lib/db/schema";

describe("notifyActiveUsers", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates one notification per active user, skipping disabled ones", async () => {
    const [active] = await ctx.db
      .insert(users)
      .values({ email: "active@example.com", passwordHash: "x", name: "Active" })
      .returning();
    const [disabled] = await ctx.db
      .insert(users)
      .values({
        email: "disabled@example.com",
        passwordHash: "x",
        name: "Disabled",
        disabledAt: new Date(),
      })
      .returning();

    await notifyActiveUsers(ctx.db, {
      type: "new_lead",
      title: "New quote request from Jane",
      entityType: "lead",
      entityId: "00000000-0000-0000-0000-000000000000",
    });

    const activeNotifications = await listNotificationsForUser(ctx.db, active.id);
    expect(activeNotifications).toHaveLength(1);
    expect(activeNotifications[0]).toMatchObject({
      type: "new_lead",
      title: "New quote request from Jane",
      entityType: "lead",
    });

    const disabledNotifications = await listNotificationsForUser(ctx.db, disabled.id);
    expect(disabledNotifications).toHaveLength(0);
  });

  it("does nothing (no error) when there are no active users", async () => {
    await expect(
      notifyActiveUsers(ctx.db, { type: "callrail_call", title: "Call" }),
    ).resolves.toBeUndefined();
  });
});
