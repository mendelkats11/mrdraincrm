"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { dollarsToCents } from "@/lib/money";
import {
  addQuoteCustomCharge,
  addQuoteLineItem,
  cancelQuote,
  convertQuoteToJob,
  createQuote,
  markQuoteAccepted,
  markQuoteDeclined,
  markQuoteSent,
  removeQuoteCustomCharge,
  removeQuoteLineItem,
  updateQuoteDetails,
  updateQuoteLineItem,
} from "./quotes";

const moneyField = z.string().trim().optional();
const uuidOrEmpty = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v !== "none" ? v : undefined));

function editableErrorMessage(error: "not_editable" | "not_found"): string {
  return error === "not_editable"
    ? "This quote can no longer be edited — it's no longer a Draft."
    : "Quote not found.";
}

const newLineItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.string().trim().optional(),
  unitPrice: z.string().trim().min(1),
});

const createQuoteSchema = z.object({
  contactId: uuidOrEmpty,
  propertyId: uuidOrEmpty,
  organizationId: uuidOrEmpty,
  description: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(5000).optional(),
  expiresAt: z.string().trim().optional(),
  taxAmount: moneyField,
  // JSON-encoded array of { description, quantity, unitPrice } — entered
  // inline on the New Quote form (one page, no separate detail-page trip
  // required before the quote shows a real dollar amount).
  lineItemsJson: z.string().trim().optional(),
});

export type QuoteFormState =
  { ok: true; quoteId: string } | { ok: false; error: string } | undefined;

export async function createQuoteAction(
  _prevState: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  const session = await requireUser();
  const parsed = createQuoteSchema.safeParse({
    contactId: formData.get("contactId") || undefined,
    propertyId: formData.get("propertyId") || undefined,
    organizationId: formData.get("organizationId") || undefined,
    description: formData.get("description") || undefined,
    notes: formData.get("notes") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
    taxAmount: formData.get("taxAmount") || undefined,
    lineItemsJson: formData.get("lineItemsJson") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let newLineItems: z.infer<typeof newLineItemSchema>[] = [];
  if (parsed.data.lineItemsJson) {
    let rawLineItems: unknown;
    try {
      rawLineItems = JSON.parse(parsed.data.lineItemsJson);
    } catch {
      return { ok: false, error: "Invalid line items." };
    }
    const parsedLineItems = z.array(newLineItemSchema).safeParse(rawLineItems);
    if (!parsedLineItems.success) {
      return { ok: false, error: "Invalid line items." };
    }
    newLineItems = parsedLineItems.data;
  }

  const db = getDb();
  const quote = await createQuote(
    db,
    {
      contactId: parsed.data.contactId ?? null,
      propertyId: parsed.data.propertyId ?? null,
      organizationId: parsed.data.organizationId ?? null,
      description: parsed.data.description || null,
      notes: parsed.data.notes || null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      taxCents: parsed.data.taxAmount ? dollarsToCents(parsed.data.taxAmount) : 0,
    },
    session.user.id,
  );

  // Sequential, not parallel — see the identical note in createInvoiceAction
  // (src/lib/invoices/invoice-actions.ts): addQuoteLineItem recomputes the
  // quote's subtotal by reading-then-writing, so concurrent calls for the
  // same quote could race.
  for (const item of newLineItems) {
    await addQuoteLineItem(
      db,
      quote.id,
      {
        description: item.description,
        quantity: item.quantity || undefined,
        unitPriceCents: dollarsToCents(item.unitPrice),
      },
      session.user.id,
    );
  }

  revalidatePath("/quotes");
  return { ok: true, quoteId: quote.id };
}

export type QuoteMutationFormState = { ok: true } | { ok: false; error: string } | undefined;

const addLineItemSchema = z.object({
  quoteId: z.string().uuid(),
  description: z.string().trim().min(1, "Description is required").max(500),
  quantity: z.string().trim().optional(),
  unitPrice: z.string().trim().min(1, "Unit price is required"),
});

export async function addQuoteLineItemAction(
  _prevState: QuoteMutationFormState,
  formData: FormData,
): Promise<QuoteMutationFormState> {
  const session = await requireUser();
  const parsed = addLineItemSchema.safeParse({
    quoteId: formData.get("quoteId"),
    description: formData.get("description"),
    quantity: formData.get("quantity") || undefined,
    unitPrice: formData.get("unitPrice"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await addQuoteLineItem(
    db,
    parsed.data.quoteId,
    {
      description: parsed.data.description,
      quantity: parsed.data.quantity || undefined,
      unitPriceCents: dollarsToCents(parsed.data.unitPrice),
    },
    session.user.id,
  );
  if (!result.ok) {
    return { ok: false, error: editableErrorMessage(result.error) };
  }

  revalidatePath(`/quotes/${parsed.data.quoteId}`);
  return { ok: true };
}

const updateLineItemSchema = z.object({
  quoteId: z.string().uuid(),
  lineItemId: z.string().uuid(),
  description: z.string().trim().min(1, "Description is required").max(500),
  quantity: z.string().trim().optional(),
  unitPrice: z.string().trim().min(1, "Unit price is required"),
});

export async function updateQuoteLineItemAction(
  _prevState: QuoteMutationFormState,
  formData: FormData,
): Promise<QuoteMutationFormState> {
  const session = await requireUser();
  const parsed = updateLineItemSchema.safeParse({
    quoteId: formData.get("quoteId"),
    lineItemId: formData.get("lineItemId"),
    description: formData.get("description"),
    quantity: formData.get("quantity") || undefined,
    unitPrice: formData.get("unitPrice"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await updateQuoteLineItem(
    db,
    parsed.data.quoteId,
    parsed.data.lineItemId,
    {
      description: parsed.data.description,
      quantity: parsed.data.quantity || undefined,
      unitPriceCents: dollarsToCents(parsed.data.unitPrice),
    },
    session.user.id,
  );
  if (!result.ok) {
    return { ok: false, error: editableErrorMessage(result.error) };
  }

  revalidatePath(`/quotes/${parsed.data.quoteId}`);
  return { ok: true };
}

/** Void return, matching every other "remove" action (e.g.
 *  removeInvoiceLineItemAction) so it can be used directly with the shared
 *  RemoveButton component. */
export async function removeQuoteLineItemAction(
  quoteId: string,
  lineItemId: string,
): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await removeQuoteLineItem(db, quoteId, lineItemId, session.user.id);
  revalidatePath(`/quotes/${quoteId}`);
}

const addCustomChargeSchema = z.object({
  quoteId: z.string().uuid(),
  description: z.string().trim().min(1, "Description is required").max(500),
  amount: z.string().trim().min(1, "Amount is required"),
});

export async function addQuoteCustomChargeAction(
  _prevState: QuoteMutationFormState,
  formData: FormData,
): Promise<QuoteMutationFormState> {
  const session = await requireUser();
  const parsed = addCustomChargeSchema.safeParse({
    quoteId: formData.get("quoteId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await addQuoteCustomCharge(
    db,
    parsed.data.quoteId,
    parsed.data.description,
    dollarsToCents(parsed.data.amount),
    session.user.id,
  );
  if (!result.ok) {
    return { ok: false, error: editableErrorMessage(result.error) };
  }

  revalidatePath(`/quotes/${parsed.data.quoteId}`);
  return { ok: true };
}

export async function removeQuoteCustomChargeAction(
  quoteId: string,
  chargeId: string,
): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await removeQuoteCustomCharge(db, quoteId, chargeId, session.user.id);
  revalidatePath(`/quotes/${quoteId}`);
}

const updateQuoteDetailsSchema = z.object({
  quoteId: z.string().uuid(),
  contactId: uuidOrEmpty,
  propertyId: uuidOrEmpty,
  organizationId: uuidOrEmpty,
  description: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(5000).optional(),
  expiresAt: z.string().trim().optional(),
  taxAmount: moneyField,
});

export async function updateQuoteDetailsAction(
  _prevState: QuoteMutationFormState,
  formData: FormData,
): Promise<QuoteMutationFormState> {
  const session = await requireUser();
  const parsed = updateQuoteDetailsSchema.safeParse({
    quoteId: formData.get("quoteId"),
    contactId: formData.get("contactId") || undefined,
    propertyId: formData.get("propertyId") || undefined,
    organizationId: formData.get("organizationId") || undefined,
    description: formData.get("description") || undefined,
    notes: formData.get("notes") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
    taxAmount: formData.get("taxAmount") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await updateQuoteDetails(
    db,
    parsed.data.quoteId,
    {
      contactId: parsed.data.contactId ?? null,
      propertyId: parsed.data.propertyId ?? null,
      organizationId: parsed.data.organizationId ?? null,
      description: parsed.data.description || null,
      notes: parsed.data.notes || null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      taxCents:
        parsed.data.taxAmount !== undefined ? dollarsToCents(parsed.data.taxAmount) : undefined,
    },
    session.user.id,
  );
  if (!result.ok) {
    return { ok: false, error: editableErrorMessage(result.error) };
  }

  revalidatePath(`/quotes/${parsed.data.quoteId}`);
  return { ok: true };
}

function transitionErrorMessage(error: "not_found" | "invalid_transition", action: string): string {
  return error === "not_found"
    ? "Quote not found."
    : `This quote can't be ${action} from its current status.`;
}

export async function markQuoteSentAction(quoteId: string): Promise<QuoteMutationFormState> {
  const session = await requireUser();
  const db = getDb();
  const result = await markQuoteSent(db, quoteId, session.user.id);
  if (!result.ok) return { ok: false, error: transitionErrorMessage(result.error, "marked Sent") };

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true };
}

export async function markQuoteAcceptedAction(quoteId: string): Promise<QuoteMutationFormState> {
  const session = await requireUser();
  const db = getDb();
  const result = await markQuoteAccepted(db, quoteId, session.user.id);
  if (!result.ok)
    return { ok: false, error: transitionErrorMessage(result.error, "marked Accepted") };

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true };
}

export async function markQuoteDeclinedAction(quoteId: string): Promise<QuoteMutationFormState> {
  const session = await requireUser();
  const db = getDb();
  const result = await markQuoteDeclined(db, quoteId, session.user.id);
  if (!result.ok)
    return { ok: false, error: transitionErrorMessage(result.error, "marked Declined") };

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true };
}

export async function cancelQuoteAction(quoteId: string): Promise<QuoteMutationFormState> {
  const session = await requireUser();
  const db = getDb();
  const result = await cancelQuote(db, quoteId, session.user.id);
  if (!result.ok) return { ok: false, error: transitionErrorMessage(result.error, "cancelled") };

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true };
}

export type ConvertQuoteFormState =
  { ok: true; jobId: string } | { ok: false; error: string } | undefined;

export async function convertQuoteToJobAction(quoteId: string): Promise<ConvertQuoteFormState> {
  const session = await requireUser();
  const db = getDb();
  const result = await convertQuoteToJob(db, quoteId, session.user.id);
  if (!result.ok) {
    const messages: Record<typeof result.error, string> = {
      not_found: "Quote not found.",
      already_converted: "This quote has already been converted into a job.",
      invalid_status: "Only an Accepted quote can be converted into a job.",
    };
    return { ok: false, error: messages[result.error] };
  }

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/jobs");
  return { ok: true, jobId: result.jobId };
}
