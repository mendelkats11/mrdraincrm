"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { updateSidebarPreferences } from "./user-preferences";

export async function setSidebarPreferencesAction(input: {
  itemOrder?: string[];
  itemHidden?: string[];
  collapsed?: boolean;
}) {
  const session = await requireUser();
  const db = getDb();
  await updateSidebarPreferences(db, session.user.id, input);
  revalidatePath("/", "layout");
}
