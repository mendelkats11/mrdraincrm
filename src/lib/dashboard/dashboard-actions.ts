"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { updateDashboardPreferences, type DashboardMode } from "@/lib/preferences/user-preferences";

export async function setDashboardModeAction(mode: DashboardMode) {
  const session = await requireUser();
  const db = getDb();
  await updateDashboardPreferences(db, session.user.id, { dashboardMode: mode });
  revalidatePath("/");
}

export async function setDashboardWidgetsAction(widgetOrder: string[], widgetHidden: string[]) {
  const session = await requireUser();
  const db = getDb();
  await updateDashboardPreferences(db, session.user.id, { widgetOrder, widgetHidden });
  revalidatePath("/");
}
