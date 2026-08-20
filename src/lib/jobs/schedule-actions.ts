"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { clearJobSchedule, updateJobSchedule } from "./jobs";

function combineDateTime(dateStr: string, timeStr?: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!timeStr) return new Date(y, m - 1, d, 0, 0);
  const [h, min] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
}

const scheduleSchema = z.object({
  jobId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  startTime: z.string().trim().optional(),
  endTime: z.string().trim().optional(),
  timeTbd: z.union([z.literal("on"), z.literal("")]).optional(),
});

export type SimpleFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function updateJobScheduleAction(
  _prevState: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const session = await requireUser();
  const parsed = scheduleSchema.safeParse({
    jobId: formData.get("jobId"),
    date: formData.get("date"),
    startTime: formData.get("startTime") || undefined,
    endTime: formData.get("endTime") || undefined,
    timeTbd: formData.get("timeTbd") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const isTbd = parsed.data.timeTbd === "on";
  const scheduledStart = combineDateTime(
    parsed.data.date,
    isTbd ? undefined : parsed.data.startTime,
  );
  const scheduledEnd =
    !isTbd && parsed.data.endTime ? combineDateTime(parsed.data.date, parsed.data.endTime) : null;

  const db = getDb();
  await updateJobSchedule(
    db,
    parsed.data.jobId,
    { scheduledStart, scheduledEnd, timeTbd: isTbd },
    session.user.id,
  );

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${parsed.data.jobId}`);
  revalidatePath("/schedule");
  return { ok: true };
}

export async function clearJobScheduleAction(jobId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await clearJobSchedule(db, jobId, session.user.id);
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
}
