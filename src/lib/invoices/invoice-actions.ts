"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getStorageProvider } from "@/lib/storage";
import { dollarsToCents } from "@/lib/money";
import { uploadInvoiceLogo } from "@/lib/pdf/logo";
import {
  addInvoiceLineItem,
  createInvoice,
  createInvoiceFromScratch,
  markInvoiceSent,
  removeInvoiceLineItem,
  updateInvoiceDetails,
  updateInvoiceLineItem,
  voidInvoice,
} from "./invoices";
import { getInvoiceTemplateSettings, updateInvoiceTemplateSettings } from "./invoice-settings";

const moneyField = z.string().trim().optional();
const uuidOrEmpty = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

function editableErrorMessage(error: "not_editable" | "not_found"): string {
  return error === "not_editable"
    ? "This invoice can no longer be edited — it has already been sent."
    : "Invoice not found.";
}

// logoKey is deliberately NOT part of this schema — it must never be taken
// from client input. It is a private-bucket R2 object key; accepting it
// from the client would let anyone point an invoice at an arbitrary object
// key and have the server mint a signed URL for it (an IDOR). The only
// legitimate way a logo gets attached is uploadInvoiceLogoAction writing
// the business-wide default, which createInvoiceAction reads server-side
// below — there is no per-invoice logo picker in the UI, by design.
const invoiceDetailFieldsSchema = z.object({
  businessName: z.string().trim().max(200).optional(),
  businessAddress: z.string().trim().max(2000).optional(),
  accentColor: z.string().trim().max(20).optional(),
  fontFamily: z.string().trim().max(50).optional(),
  customerName: z.string().trim().max(200).optional(),
  customerAddress: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(5000).optional(),
  paymentInstructions: z.string().trim().max(2000).optional(),
  footer: z.string().trim().max(500).optional(),
  taxAmount: moneyField,
});

const createInvoiceSchema = invoiceDetailFieldsSchema.extend({
  jobId: uuidOrEmpty,
  contactId: uuidOrEmpty,
  propertyId: uuidOrEmpty,
  organizationId: uuidOrEmpty,
});

export type InvoiceFormState =
  { ok: true; invoiceId: string } | { ok: false; error: string } | undefined;

/**
 * Handles both entry points with one action: "+ New Invoice" from a job
 * page (jobId set) and "Create invoice from scratch" from /invoices
 * (jobId absent — a minimal job is created automatically underneath, see
 * createInvoiceFromScratch's own comment for why that's necessary rather
 * than making invoices job-less).
 */
export async function createInvoiceAction(
  _prevState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const session = await requireUser();
  const parsed = createInvoiceSchema.safeParse({
    jobId: formData.get("jobId") || undefined,
    contactId: formData.get("contactId") || undefined,
    propertyId: formData.get("propertyId") || undefined,
    organizationId: formData.get("organizationId") || undefined,
    businessName: formData.get("businessName") || undefined,
    businessAddress: formData.get("businessAddress") || undefined,
    accentColor: formData.get("accentColor") || undefined,
    fontFamily: formData.get("fontFamily") || undefined,
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
  const templateSettings = await getInvoiceTemplateSettings(db);
  const detailFields = {
    businessName: parsed.data.businessName || null,
    businessAddress: parsed.data.businessAddress || null,
    logoKey: templateSettings.logoKey,
    accentColor: parsed.data.accentColor || null,
    fontFamily: parsed.data.fontFamily || null,
    customerName: parsed.data.customerName || null,
    customerAddress: parsed.data.customerAddress || null,
    notes: parsed.data.notes || null,
    paymentInstructions: parsed.data.paymentInstructions || null,
    footer: parsed.data.footer || null,
    taxCents: parsed.data.taxAmount ? dollarsToCents(parsed.data.taxAmount) : 0,
  };

  const invoice = parsed.data.jobId
    ? await createInvoice(db, { jobId: parsed.data.jobId, ...detailFields }, session.user.id)
    : await createInvoiceFromScratch(
        db,
        {
          contactId: parsed.data.contactId ?? null,
          propertyId: parsed.data.propertyId ?? null,
          organizationId: parsed.data.organizationId ?? null,
          ...detailFields,
        },
        session.user.id,
      );

  revalidatePath("/invoices");
  if (parsed.data.jobId) revalidatePath(`/jobs/${parsed.data.jobId}`);
  return { ok: true, invoiceId: invoice.id };
}

export type InvoiceMutationFormState = { ok: true } | { ok: false; error: string } | undefined;

const addLineItemSchema = z.object({
  invoiceId: z.string().uuid(),
  jobId: z.string().uuid(),
  description: z.string().trim().min(1, "Description is required").max(500),
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
  description: z.string().trim().min(1, "Description is required").max(500),
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

const updateInvoiceDetailsSchema = invoiceDetailFieldsSchema.extend({
  invoiceId: z.string().uuid(),
  jobId: z.string().uuid(),
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
    accentColor: formData.get("accentColor") || undefined,
    fontFamily: formData.get("fontFamily") || undefined,
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
      // logoKey intentionally omitted — never client-editable, see the
      // schema comment above. updateInvoiceDetails already leaves a field
      // untouched when it's absent from this input object.
      accentColor: parsed.data.accentColor || null,
      fontFamily: parsed.data.fontFamily || null,
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

export type UploadLogoFormState =
  { ok: true; key: string } | { ok: false; error: string } | undefined;

/** Business-wide default only (see invoice-settings.ts) — there's no
 *  per-invoice logo re-upload, matching businessName/businessAddress. */
export async function uploadInvoiceLogoAction(
  _prevState: UploadLogoFormState,
  formData: FormData,
): Promise<UploadLogoFormState> {
  const session = await requireUser();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a logo file first." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadResult = await uploadInvoiceLogo(getStorageProvider(), {
    buffer,
    contentType: file.type,
  });
  if (!uploadResult.ok) return { ok: false, error: uploadResult.error };

  const db = getDb();
  await updateInvoiceTemplateSettings(db, { logoKey: uploadResult.key }, session.user.id);

  revalidatePath("/invoices/settings");
  return { ok: true, key: uploadResult.key };
}

const updateTemplateSchema = z.object({
  accentColor: z.string().trim().min(1),
  fontFamily: z.string().trim().min(1),
});

export type UpdateTemplateFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function updateInvoiceTemplateAction(
  _prevState: UpdateTemplateFormState,
  formData: FormData,
): Promise<UpdateTemplateFormState> {
  const session = await requireUser();
  const parsed = updateTemplateSchema.safeParse({
    accentColor: formData.get("accentColor"),
    fontFamily: formData.get("fontFamily"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  await updateInvoiceTemplateSettings(
    db,
    { accentColor: parsed.data.accentColor, fontFamily: parsed.data.fontFamily },
    session.user.id,
  );

  revalidatePath("/invoices/settings");
  return { ok: true };
}
