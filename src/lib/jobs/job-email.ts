"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { recordActivity } from "@/lib/audit/activity";
import { sendTrackedEmail } from "@/lib/email/send-tracked-email";
import { jobConfirmationEmailTemplate } from "@/lib/email/templates";
import { getJob } from "./jobs";
import { appSettings, contactEmails } from "@/lib/db/schema";

/** Best-effort prefill for the "send confirmation" dialog's To field. */
export async function resolveJobRecipientEmail(jobId: string): Promise<string | null> {
  await requireUser();
  const db = getDb();

  const job = await getJob(db, jobId);
  if (!job?.contactId) return null;

  const [email] = await db
    .select({ email: contactEmails.email })
    .from(contactEmails)
    .where(eq(contactEmails.contactId, job.contactId))
    .orderBy(contactEmails.isPrimary);

  return email?.email ?? null;
}

const sendJobConfirmationSchema = z.object({
  jobId: z.string().uuid(),
  to: z.string().trim().email("Enter a valid email address."),
});

export type SendJobConfirmationFormState = { ok: true } | { ok: false; error: string } | undefined;

/**
 * Manual only, by design — the owner decides when a confirmation is
 * accurate to send (a job may be created or rescheduled well before it's
 * ready to confirm with the customer). No automatic trigger on job
 * creation or scheduling.
 */
export async function sendJobConfirmationEmailAction(
  _prevState: SendJobConfirmationFormState,
  formData: FormData,
): Promise<SendJobConfirmationFormState> {
  const session = await requireUser();
  const parsed = sendJobConfirmationSchema.safeParse({
    jobId: formData.get("jobId"),
    to: formData.get("to"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const job = await getJob(db, parsed.data.jobId);
  if (!job) {
    return { ok: false, error: "Job not found." };
  }

  const [settings] = await db.select().from(appSettings).limit(1);
  const serviceAddress = job.propertyAddressLine1
    ? [job.propertyAddressLine1, job.propertyCity].filter(Boolean).join(", ")
    : null;

  const { subject, text, html } = jobConfirmationEmailTemplate({
    businessName: settings?.businessName || "Mr. Drain Plumbing",
    jobNumber: job.jobNumber,
    customerName: job.organizationName ?? job.contactName ?? null,
    serviceAddress,
    scheduledAt: job.scheduledStart,
    issueDescription: job.issueDescription,
  });

  const sendResult = await sendTrackedEmail(db, {
    to: parsed.data.to,
    subject,
    text,
    html,
    template: "job_confirmation",
    relatedEntityType: "job",
    relatedEntityId: job.id,
  });

  if (!sendResult.ok) {
    return { ok: false, error: "Failed to send the email. Please try again." };
  }

  await recordActivity(db, {
    actorUserId: session.user.id,
    entityType: "job",
    entityId: job.id,
    action: "job_confirmation_emailed",
    newValue: { to: parsed.data.to },
  });

  return { ok: true };
}
