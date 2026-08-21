"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { recordActivity } from "@/lib/audit/activity";
import { sendTrackedEmail } from "@/lib/email/send-tracked-email";
import { invoiceEmailTemplate } from "@/lib/email/templates";
import { generateInvoicePdf } from "@/lib/pdf/invoice-pdf-generator";
import { contactEmails, invoices, jobs } from "@/lib/db/schema";

/**
 * Best-effort prefill for the "send invoice" dialog's To field — resolves
 * the linked job's contact's primary email, if any. Purely a convenience;
 * the sender can always type/override a different address, since invoices
 * can exist without a contact at all (docs/CLAUDE.md §6).
 */
export async function resolveInvoiceRecipientEmail(invoiceId: string): Promise<string | null> {
  await requireUser();
  const db = getDb();

  const [row] = await db
    .select({ contactId: jobs.contactId })
    .from(invoices)
    .innerJoin(jobs, eq(jobs.id, invoices.jobId))
    .where(eq(invoices.id, invoiceId));

  if (!row?.contactId) return null;

  const [email] = await db
    .select({ email: contactEmails.email })
    .from(contactEmails)
    .where(eq(contactEmails.contactId, row.contactId))
    .orderBy(contactEmails.isPrimary);

  return email?.email ?? null;
}

const sendInvoiceEmailSchema = z.object({
  invoiceId: z.string().uuid(),
  to: z.string().trim().email("Enter a valid email address."),
});

export type SendInvoiceEmailFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function sendInvoiceEmailAction(
  _prevState: SendInvoiceEmailFormState,
  formData: FormData,
): Promise<SendInvoiceEmailFormState> {
  const session = await requireUser();
  const parsed = sendInvoiceEmailSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    to: formData.get("to"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await generateInvoicePdf(db, parsed.data.invoiceId);
  if (!result) {
    return { ok: false, error: "Invoice not found." };
  }
  const { invoice, buffer } = result;

  const { subject, text, html } = invoiceEmailTemplate({
    businessName: invoice.businessName || "Mr. Drain Plumbing",
    invoiceNumber: invoice.invoiceNumber,
    customerName: invoice.customerName,
    totalCents: invoice.totalCents,
    paymentInstructions: invoice.paymentInstructions,
  });

  const sendResult = await sendTrackedEmail(db, {
    to: parsed.data.to,
    subject,
    text,
    html,
    attachments: [
      { filename: `${invoice.invoiceNumber}.pdf`, content: buffer, contentType: "application/pdf" },
    ],
    template: "invoice",
    relatedEntityType: "invoice",
    relatedEntityId: invoice.id,
  });

  if (!sendResult.ok) {
    return { ok: false, error: "Failed to send the email. Please try again." };
  }

  await recordActivity(db, {
    actorUserId: session.user.id,
    entityType: "invoice",
    entityId: invoice.id,
    action: "invoice_emailed",
    newValue: { to: parsed.data.to },
  });

  return { ok: true };
}
