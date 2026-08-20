"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { dollarsToCents } from "@/lib/money";
import {
  addInvoiceLineItem,
  createInvoice,
  markInvoiceSent,
  removeInvoiceLineItem,
  updateInvoiceDetails,
  updateInvoiceLineItem,
  voidInvoice,
} from "./invoices";

const moneyField = z.string().trim().optional();

function editableErrorMessage(error: "not_editable" | "not_found"): string {
  return error === "not_editable"
    ? "This invoice can no longer be edited — it has already been sent."
    : "Invoice not found.";
}

const createInvoiceSchema = z.object({
  jobId: z.string().uuid(),
  businessName: z.string().trim().optional(),
  businessAddress: z.string().trim().optional(),
  logoUrl: z.string().trim().optional(),
  customerName: z.string().trim().optional(),
  customerAddress: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  paymentInstructions: z.string().trim().optional(),
  footer: z.string().trim().optional(),
  taxAmount: moneyField,
});

export type InvoiceFormState =
  { ok: true; invoiceId: string } | { ok: false; error: string } | undefined;

export async function createInvoiceAction(
  _prevState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const session = await requireUser();
  const parsed = createInvoiceSchema.safeParse({
    jobId: formData.get("jobId"),
    businessName: formData.get("businessName") || undefined,
    businessAddress: formData.get("businessAddress") || undefined,
    logoUrl: formData.get("logoUrl") || undefined,
    customerName: formData.get("customerName") || undefined,
    customerAddress: formData.get("customerAddress") || undefined,
    notes: formData.get("notes") || undefined,
    paymentInstructions: formData.get("paymentInstructions") || undefined,
    footer: formData.get("footer") || undefined,
    taxAmount: formData.get("taxAmount") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const invoice = await createInvoice(
    db,
    {
      jobId: parsed.data.jobId,
      businessName: parsed.data.businessName || null,
      businessAddress: parsed.data.businessAddress || null,
      logoUrl: parsed.data.logoUrl || null,
      customerName: parsed.data.customerName || null,
      customerAddress: parsed.data.customerAddress || null,
      notes: parsed.data.notes || null,
      paymentInstructions: parsed.data.paymentInstructions || null,
      footer: parsed.data.footer || null,
      taxCents: parsed.data.taxAmount ? dollarsToCents(parsed.data.taxAmount) : 0,
    },
    session.user.id,
  );

  revalidatePath("/invoices");
  revalidatePath(`/jobs/${parsed.data.jobId}`);
  return { ok: true, invoiceId: invoice.id };
}

export type InvoiceMutationFormState = { ok: true } | { ok: false; error: string } | undefined;

const addLineItemSchema = z.object({
  invoiceId: z.string().uuid(),
  jobId: z.string().uuid(),
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.string().trim().optional(),
  unitPrice: z.string().trim().min(1, "Unit price is required"),
});

export async function addInvoiceLineItemAction(
  _prevState: InvoiceMutationFormState,
  formData: FormData,
): Promise<InvoiceMutationFormState> {
  const session = await requireUser();
  const parsed = addLineItemSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    jobId: formData.get("jobId"),
    description: formData.get("description"),
    quantity: formData.get("quantity") || undefined,
    unitPrice: formData.get("unitPrice"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await addInvoiceLineItem(
    db,
    parsed.data.invoiceId,
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

  revalidatePath(`/invoices/${parsed.data.invoiceId}`);
  revalidatePath(`/jobs/${parsed.data.jobId}`);
  return { ok: true };
}

const updateLineItemSchema = z.object({
  invoiceId: z.string().uuid(),
  jobId: z.string().uuid(),
  lineItemId: z.string().uuid(),
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.string().trim().optional(),
  unitPrice: z.string().trim().min(1, "Unit price is required"),
});

export async function updateInvoiceLineItemAction(
  _prevState: InvoiceMutationFormState,
  formData: FormData,
): Promise<InvoiceMutationFormState> {
  const session = await requireUser();
  const parsed = updateLineItemSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    jobId: formData.get("jobId"),
    lineItemId: formData.get("lineItemId"),
    description: formData.get("description"),
    quantity: formData.get("quantity") || undefined,
    unitPrice: formData.get("unitPrice"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await updateInvoiceLineItem(
    db,
    parsed.data.invoiceId,
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

  revalidatePath(`/invoices/${parsed.data.invoiceId}`);
  revalidatePath(`/jobs/${parsed.data.jobId}`);
  return { ok: true };
}

/** Void return (matching every other "remove" action in this codebase, e.g.
 *  removeJobCustomChargeAction) so it can be used directly with the shared
 *  RemoveButton component — a race where the invoice was sent in another
 *  tab between page load and this click is rare enough not to need its own
 *  UI error surface here. */
export async function removeInvoiceLineItemAction(
  invoiceId: string,
  jobId: string,
  lineItemId: string,
): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await removeInvoiceLineItem(db, invoiceId, lineItemId, session.user.id);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/jobs/${jobId}`);
}

const updateInvoiceDetailsSchema = z.object({
  invoiceId: z.string().uuid(),
  jobId: z.string().uuid(),
  businessName: z.string().trim().optional(),
  businessAddress: z.string().trim().optional(),
  logoUrl: z.string().trim().optional(),
  customerName: z.string().trim().optional(),
  customerAddress: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  paymentInstructions: z.string().trim().optional(),
  footer: z.string().trim().optional(),
  taxAmount: moneyField,
});

export async function updateInvoiceDetailsAction(
  _prevState: InvoiceMutationFormState,
  formData: FormData,
): Promise<InvoiceMutationFormState> {
  const session = await requireUser();
  const parsed = updateInvoiceDetailsSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    jobId: formData.get("jobId"),
    businessName: formData.get("businessName") || undefined,
    businessAddress: formData.get("businessAddress") || undefined,
    logoUrl: formData.get("logoUrl") || undefined,
    customerName: formData.get("customerName") || undefined,
    customerAddress: formData.get("customerAddress") || undefined,
    notes: formData.get("notes") || undefined,
    paymentInstructions: formData.get("paymentInstructions") || undefined,
    footer: formData.get("footer") || undefined,
    taxAmount: formData.get("taxAmount") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await updateInvoiceDetails(
    db,
    parsed.data.invoiceId,
    {
      businessName: parsed.data.businessName || null,
      businessAddress: parsed.data.businessAddress || null,
      logoUrl: parsed.data.logoUrl || null,
      customerName: parsed.data.customerName || null,
      customerAddress: parsed.data.customerAddress || null,
      notes: parsed.data.notes || null,
      paymentInstructions: parsed.data.paymentInstructions || null,
      footer: parsed.data.footer || null,
      taxCents:
        parsed.data.taxAmount !== undefined ? dollarsToCents(parsed.data.taxAmount) : undefined,
    },
    session.user.id,
  );
  if (!result.ok) {
    return { ok: false, error: editableErrorMessage(result.error) };
  }

  revalidatePath(`/invoices/${parsed.data.invoiceId}`);
  revalidatePath(`/jobs/${parsed.data.jobId}`);
  return { ok: true };
}

export async function markInvoiceSentAction(
  invoiceId: string,
  jobId: string,
): Promise<InvoiceMutationFormState> {
  const session = await requireUser();
  const db = getDb();
  const result = await markInvoiceSent(db, invoiceId, session.user.id);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error === "not_found"
          ? "Invoice not found."
          : "Only a Draft invoice can be marked Sent.",
    };
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

export async function voidInvoiceAction(
  invoiceId: string,
  jobId: string,
  reason: string,
): Promise<InvoiceMutationFormState> {
  const session = await requireUser();
  const db = getDb();
  const result = await voidInvoice(db, invoiceId, reason, session.user.id);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error === "not_found" ? "Invoice not found." : "This invoice is already void.",
    };
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}
