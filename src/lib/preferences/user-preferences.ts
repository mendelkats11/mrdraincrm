import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { userPreferences } from "@/lib/db/schema";

export { applyOrderAndVisibility } from "./apply-order";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export type DashboardMode = "operations" | "financial";

export interface UserPreferences {
  dashboardMode: DashboardMode;
  dashboardWidgetOrder: string[];
  dashboardWidgetHidden: string[];
  sidebarItemOrder: string[];
  sidebarItemHidden: string[];
  sidebarCollapsed: boolean;
}

const DEFAULTS: UserPreferences = {
  dashboardMode: "operations",
  dashboardWidgetOrder: [],
  dashboardWidgetHidden: [],
  sidebarItemOrder: [],
  sidebarItemHidden: [],
  sidebarCollapsed: false,
};

/** No row yet = every sensible default (docs/PROJECT_SPEC.md §25: "sensible
 *  defaults are provided") — an empty order list means "use the
 *  application-defined default order," not "show nothing." */
export async function getUserPreferences<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  userId: string,
): Promise<UserPreferences> {
  const [row] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
  if (!row) return DEFAULTS;
  return {
    dashboardMode: row.dashboardMode,
    dashboardWidgetOrder: row.dashboardWidgetOrder,
    dashboardWidgetHidden: row.dashboardWidgetHidden,
    sidebarItemOrder: row.sidebarItemOrder,
    sidebarItemHidden: row.sidebarItemHidden,
    sidebarCollapsed: row.sidebarCollapsed,
  };
}

async function findOrCreateRow<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  userId: string,
) {
  const [existing] = await db
    .select({ id: userPreferences.id })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId));
  if (existing) return existing.id;
  const [created] = await db.insert(userPreferences).values({ userId }).returning({
    id: userPreferences.id,
  });
  return created.id;
}

export async function updateDashboardPreferences<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  userId: string,
  input: { dashboardMode?: DashboardMode; widgetOrder?: string[]; widgetHidden?: string[] },
) {
  const id = await findOrCreateRow(db, userId);
  await db
    .update(userPreferences)
    .set({
      dashboardMode: input.dashboardMode,
      dashboardWidgetOrder: input.widgetOrder,
      dashboardWidgetHidden: input.widgetHidden,
      updatedAt: new Date(),
    })
    .where(eq(userPreferences.id, id));
  return { ok: true as const };
}

export async function updateSidebarPreferences<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  userId: string,
  input: { itemOrder?: string[]; itemHidden?: string[]; collapsed?: boolean },
) {
  const id = await findOrCreateRow(db, userId);
  await db
    .update(userPreferences)
    .set({
      sidebarItemOrder: input.itemOrder,
      sidebarItemHidden: input.itemHidden,
      sidebarCollapsed: input.collapsed,
      updatedAt: new Date(),
    })
    .where(eq(userPreferences.id, id));
  return { ok: true as const };
}
