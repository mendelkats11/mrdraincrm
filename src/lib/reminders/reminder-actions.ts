"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import {
  cancelReminder,
  completeReminder,
  createReminder,
  dismissReminderToday,
  reopenReminder,
  updateReminder,
} from "./reminders";

const uuidOrEmpty = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const reminderFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  dueDate: z.string().trim().min(1, "Due date is required"),
  dueTime: z.string().trim().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  recurrence: z.enum(["one_time", "daily", "weekly", "monthly", "yearly", "custom"]).optional(),
  contactId: uuidOrEmpty,
  organizationId: uuidOrEmpty,
  propertyId: uuidOrEmpty,
  jobId: uuidOrEmpty,
});

/** dueDate + optional dueTime (defaults to 9:00 AM) combine into one instant — reminders always have a concrete time, matching the schema's single NOT NULL dueAt column. */
function combineDueAt(dueDate: string, dueTime?: string): Date {
  const time = dueTime && dueTime.trim() ? dueTime : "09:00";
  return new Date(`${dueDate}T${time}:00`);
}

export type ReminderFormState =
  { ok: true; reminderId: string } | { ok: false; error: string } | undefined;

export async function createReminderAction(
  _prevState: ReminderFormState,
  formData: FormData,
): Promise<ReminderFormState> {
  const session = await requireUser();
  const parsed = reminderFieldsSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    dueDate: formData.get("dueDate"),
    dueTime: formData.get("dueTime") || undefined,
    priority: formData.get("priority") || undefined,
    recurrence: formData.get("recurrence") || undefined,
    contactId: formData.get("contactId") || undefined,
    organizationId: formData.get("organizationId") || undefined,
    propertyId: formData.get("propertyId") || undefined,
    jobId: formData.get("jobId") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const reminder = await createReminder(
    db,
    {
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueAt: combineDueAt(parsed.data.dueDate, parsed.data.dueTime),
      priority: parsed.data.priority,
      recurrence: parsed.data.recurrence,
      contactId: parsed.data.contactId ?? null,
      organizationId: parsed.data.organizationId ?? null,
      propertyId: parsed.data.propertyId ?? null,
      jobId: parsed.data.jobId ?? null,
    },
    session.user.id,
  );

  revalidatePath("/reminders");
  revalidatePath("/");
  return { ok: true, reminderId: reminder.id };
}

export type ReminderMutationFormState = { ok: true } | { ok: false; error: string } | undefined;

const updateReminderSchema = reminderFieldsSchema.extend({ reminderId: z.string().uuid() });

export async function updateReminderAction(
  _prevState: ReminderMutationFormState,
  formData: FormData,
): Promise<ReminderMutationFormState> {
  const session = await requireUser();
  const parsed = updateReminderSchema.safeParse({
    reminderId: formData.get("reminderId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    dueDate: formData.get("dueDate"),
    dueTime: formData.get("dueTime") || undefined,
    priority: formData.get("priority") || undefined,
    recurrence: formData.get("recurrence") || undefined,
    contactId: formData.get("contactId") || undefined,
    organizationId: formData.get("organizationId") || undefined,
    propertyId: formData.get("propertyId") || undefined,
    jobId: formData.get("jobId") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await updateReminder(
    db,
    parsed.data.reminderId,
    {
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueAt: combineDueAt(parsed.data.dueDate, parsed.data.dueTime),
      priority: parsed.data.priority,
      recurrence: parsed.data.recurrence,
      contactId: parsed.data.contactId ?? null,
      organizationId: parsed.data.organizationId ?? null,
      propertyId: parsed.data.propertyId ?? null,
      jobId: parsed.data.jobId ?? null,
    },
    session.user.id,
  );
  if (!result.ok) return { ok: false, error: "Reminder not found." };

  revalidatePath("/reminders");
  revalidatePath("/");
  return { ok: true };
}

export async function completeReminderAction(
  reminderId: string,
): Promise<ReminderMutationFormState> {
  const session = await requireUser();
  const db = getDb();
  const result = await completeReminder(db, reminderId, session.user.id);
  if (!result.ok) {
    const messages = {
      not_found: "Reminder not found.",
      already_completed: "This reminder is already completed.",
      already_cancelled: "This reminder was already dismissed permanently.",
    };
    return { ok: false, error: messages[result.error] };
  }

  revalidatePath("/reminders");
  revalidatePath("/");
  return { ok: true };
}

export async function cancelReminderAction(reminderId: string): Promise<ReminderMutationFormState> {
  const session = await requireUser();
  const db = getDb();
  const result = await cancelReminder(db, reminderId, session.user.id);
  if (!result.ok) {
    const messages = {
      not_found: "Reminder not found.",
      already_completed: "This reminder is already completed.",
      already_cancelled: "This reminder is already hidden.",
    };
    return { ok: false, error: messages[result.error] };
  }

  revalidatePath("/reminders");
  revalidatePath("/");
  return { ok: true };
}

export async function reopenReminderAction(reminderId: string): Promise<ReminderMutationFormState> {
  const session = await requireUser();
  const db = getDb();
  const result = await reopenReminder(db, reminderId, session.user.id);
  if (!result.ok) {
    const messages = {
      not_found: "Reminder not found.",
      not_closed: "This reminder is still active.",
    };
    return { ok: false, error: messages[result.error] };
  }

  revalidatePath("/reminders");
  revalidatePath("/");
  return { ok: true };
}

export async function dismissReminderAction(reminderId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await dismissReminderToday(db, reminderId, session.user.id);

  revalidatePath("/reminders");
  revalidatePath("/");
}
