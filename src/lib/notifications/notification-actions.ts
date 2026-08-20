"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { markAllNotificationsRead, markNotificationRead } from "./notifications";

export async function markNotificationReadAction(notificationId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await markNotificationRead(db, notificationId, session.user.id);
  revalidatePath("/");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await markAllNotificationsRead(db, session.user.id);
  revalidatePath("/");
}
