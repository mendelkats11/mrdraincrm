"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { setIncludeTaxInRevenue } from "./reporting-settings";

export type ReportingSettingsFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function updateReportingSettingsAction(
  _prevState: ReportingSettingsFormState,
  formData: FormData,
): Promise<ReportingSettingsFormState> {
  const session = await requireUser();
  const includeTaxInRevenue = formData.get("includeTaxInRevenue") === "on";

  const db = getDb();
  await setIncludeTaxInRevenue(db, includeTaxInRevenue, session.user.id);

  revalidatePath("/reports");
  revalidatePath("/reports/financial");
  return { ok: true };
}
