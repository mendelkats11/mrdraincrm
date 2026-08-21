"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { recordActivity } from "@/lib/audit/activity";
import { sendTrackedEmail } from "@/lib/email/send-tracked-email";
import { quoteEmailTemplate } from "@/lib/email/templates";
import { generateQuotePdf } from "@/lib/pdf/quote-pdf-generator";
import { contactEmails, quotes } from "@/lib/db/schema";

/**
 * Best-effort prefill for the "send quote" dialog's To field — resolves the
 * quote's own contactId's primary email, if any (quotes carry contactId
 * directly, unlike invoices which only have it via their job).
 */
export async function resolveQuoteRecipientEmail(quoteId: string): Promise<string | null> {
  await requireUser();
  const db = getDb();

  const [row] = await db
    .select({ contactId: quotes.contactId })
    .from(quotes)
    .where(eq(quotes.id, quoteId));
  if (!row?.contactId) return null;

  const [email] = await db
    .select({ email: contactEmails.email })
    .from(contactEmails)
    .where(eq(contactEmails.contactId, row.contactId))
    .orderBy(contactEmails.isPrimary);

  return email?.email ?? null;
}

const sendQuoteEmailSchema = z.object({
  quoteId: z.string().uuid(),
  to: z.string().trim().email("Enter a valid email address."),
});

export type SendQuoteEmailFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function sendQuoteEmailAction(
  _prevState: SendQuoteEmailFormState,
  formData: FormData,
): Promise<SendQuoteEmailFormState> {
  const session = await requireUser();
  const parsed = sendQuoteEmailSchema.safeParse({
    quoteId: formData.get("quoteId"),
    to: formData.get("to"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await generateQuotePdf(db, parsed.data.quoteId);
  if (!result) {
    return { ok: false, error: "Quote not found." };
  }
  const { quote, businessName, customerName, buffer } = result;

  const { subject, text, html } = quoteEmailTemplate({
    businessName: businessName || "Mr. Drain Plumbing",
    quoteNumber: quote.quoteNumber,
    customerName,
    totalCents: quote.subtotalCents + quote.taxCents,
    expiresAt: quote.expiresAt,
  });

  const sendResult = await sendTrackedEmail(db, {
    to: parsed.data.to,
    subject,
    text,
    html,
    attachments: [
      { filename: `${quote.quoteNumber}.pdf`, content: buffer, contentType: "application/pdf" },
    ],
    template: "quote",
    relatedEntityType: "quote",
    relatedEntityId: quote.id,
  });

  if (!sendResult.ok) {
    return { ok: false, error: "Failed to send the email. Please try again." };
  }

  await recordActivity(db, {
    actorUserId: session.user.id,
    entityType: "quote",
    entityId: quote.id,
    action: "quote_emailed",
    newValue: { to: parsed.data.to },
  });

  return { ok: true };
}
