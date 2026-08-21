// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import {
  getUserPreferences,
  updateDashboardPreferences,
  updateSidebarPreferences,
} from "@/lib/preferences/user-preferences";
import { userPreferences, users } from "@/lib/db/schema";

describe("user preferences", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let userId: string;

  beforeEach(async () => {
    ctx = await createTestDb();
    const [user] = await ctx.db
      .insert(users)
      .values({ email: "owner@example.com", passwordHash: "x", name: "Owner" })
      .returning();
    userId = user.id;
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("returns sensible defaults when no row exists yet", async () => {
    const prefs = await getUserPreferences(ctx.db, userId);
    expect(prefs).toEqual({
      dashboardMode: "operations",
      dashboardWidgetOrder: [],
      dashboardWidgetHidden: [],
      sidebarItemOrder: [],
      sidebarItemHidden: [],
      sidebarCollapsed: false,
    });
  });

  it("creates the row lazily on first dashboard update, and does not duplicate it on a later write", async () => {
    await updateDashboardPreferences(ctx.db, userId, {
      dashboardMode: "financial",
      widgetOrder: ["open_jobs", "new_leads"],
      widgetHidden: ["recent_activity"],
    });
    expect(await ctx.db.select().from(userPreferences)).toHaveLength(1);

    let prefs = await getUserPreferences(ctx.db, userId);
    expect(prefs.dashboardMode).toBe("financial");
    expect(prefs.dashboardWidgetOrder).toEqual(["open_jobs", "new_leads"]);
    expect(prefs.dashboardWidgetHidden).toEqual(["recent_activity"]);

    await updateDashboardPreferences(ctx.db, userId, { dashboardMode: "operations" });
    expect(await ctx.db.select().from(userPreferences)).toHaveLength(1);
    prefs = await getUserPreferences(ctx.db, userId);
    expect(prefs.dashboardMode).toBe("operations");
    // Fields not passed on the second call are left untouched, not reset.
    expect(prefs.dashboardWidgetOrder).toEqual(["open_jobs", "new_leads"]);
  });

  it("persists sidebar order, hidden items, and collapsed state independently of dashboard prefs", async () => {
    await updateSidebarPreferences(ctx.db, userId, {
      itemOrder: ["/jobs", "/leads"],
      itemHidden: ["/properties"],
      collapsed: true,
    });

    const prefs = await getUserPreferences(ctx.db, userId);
    expect(prefs.sidebarItemOrder).toEqual(["/jobs", "/leads"]);
    expect(prefs.sidebarItemHidden).toEqual(["/properties"]);
    expect(prefs.sidebarCollapsed).toBe(true);
    // Untouched by the sidebar update.
    expect(prefs.dashboardMode).toBe("operations");
  });

  it("keeps each user's preferences independent", async () => {
    const [otherUser] = await ctx.db
      .insert(users)
      .values({ email: "other@example.com", passwordHash: "x", name: "Other" })
      .returning();

    await updateDashboardPreferences(ctx.db, userId, { dashboardMode: "financial" });
    await updateDashboardPreferences(ctx.db, otherUser.id, { dashboardMode: "operations" });

    expect((await getUserPreferences(ctx.db, userId)).dashboardMode).toBe("financial");
    expect((await getUserPreferences(ctx.db, otherUser.id)).dashboardMode).toBe("operations");
  });
});
