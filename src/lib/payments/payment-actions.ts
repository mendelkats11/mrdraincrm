"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { dollarsToCents } from "@/lib/money";
import { recordPayment, updatePaymentDetails, voidPayment } from "./payments";

const paymentMethodSchema = z.enum(["e_transfer", "cash", "cheque", "other"]);
const uuidOrEmpty = z.union([z.literal(""), z.string().uuid()]);

const recordPaymentSchema = z.object({
  jobId: z.string().uuid(),
  invoiceId: uuidOrEmpty.optional(),
  amount: z.string().trim().min(1, "Amount is required"),
  paidAt: z.string().trim().min(1, "Date is required"),
  method: paymentMethodSchema,
  referenceNote: z.string().trim().optional(),
});

export type PaymentFormState =
  { ok: true; paymentId: string } | { ok: false; error: string } | undefined;

/** Negative amounts are accepted here — that's how a refund is recorded
 *  (docs/IMPLEMENTATION_PLAN.md §2.1.F), not a separate action. */
export async function recordPaymentAction(
  _prevState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const session = await requireUser();
  const parsed = recordPaymentSchema.safeParse({
    jobId: formData.get("jobId"),
    invoiceId: formData.get("invoiceId") || undefined,
    amount: formData.get("amount"),
    paidAt: formData.get("paidAt"),
    method: formData.get("method"),
    referenceNote: formData.get("referenceNote") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await recordPayment(
    db,
    {
      jobId: parsed.data.jobId,
      invoiceId: parsed.data.invoiceId || null,
      amountCents: dollarsToCents(parsed.data.amount),
      paidAt: new Date(parsed.data.paidAt),
      method: parsed.data.method,
      referenceNote: parsed.data.referenceNote || null,
    },
    session.user.id,
  );
  if (!result.ok) {
    return {
      ok: false,
      error: "That invoice can't currently accept a payment (it's a draft or already void).",
    };
  }

  revalidatePath(`/jobs/${parsed.data.jobId}`);
  if (parsed.data.invoiceId) {
    revalidatePath(`/invoices/${parsed.data.invoiceId}`);
    revalidatePath("/invoices");
  }
  return { ok: true, paymentId: result.paymentId };
}

export type PaymentMutationFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function voidPaymentAction(
  paymentId: string,
  jobId: string,
  invoiceId: string | null,
  reason: string,
): Promise<PaymentMutationFormState> {
  const session = await requireUser();
  const db = getDb();
  const result = await voidPayment(db, paymentId, reason, session.user.id);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error === "not_found" ? "Payment not found." : "This payment is already voided.",
    };
  }

  revalidatePath(`/jobs/${jobId}`);
  if (invoiceId) {
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/invoices");
  }
  return { ok: true };
}

const updatePaymentSchema = z.object({
  paymentId: z.string().uuid(),
  jobId: z.string().uuid(),
  invoiceId: uuidOrEmpty.optional(),
  paidAt: z.string().trim().min(1, "Date is required"),
  method: paymentMethodSchema,
  referenceNote: z.string().trim().optional(),
});

/** Only non-financial fields — amount is never editable here (Phase 8
 *  decision 5); a wrong amount must go through voidPaymentAction + a new
 *  recordPaymentAction. */
export async function updatePaymentDetailsAction(
  _prevState: PaymentMutationFormState,
  formData: FormData,
): Promise<PaymentMutationFormState> {
  const session = await requireUser();
  const parsed = updatePaymentSchema.safeParse({
    paymentId: formData.get("paymentId"),
    jobId: formData.get("jobId"),
    invoiceId: formData.get("invoiceId") || undefined,
    paidAt: formData.get("paidAt"),
    method: formData.get("method"),
    referenceNote: formData.get("referenceNote") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await updatePaymentDetails(
    db,
    parsed.data.paymentId,
    {
      paidAt: new Date(parsed.data.paidAt),
      method: parsed.data.method,
      referenceNote: parsed.data.referenceNote || null,
    },
    session.user.id,
  );
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error === "not_found" ? "Payment not found." : "A voided payment cannot be edited.",
    };
  }

  revalidatePath(`/jobs/${parsed.data.jobId}`);
  if (parsed.data.invoiceId) {
    revalidatePath(`/invoices/${parsed.data.invoiceId}`);
  }
  return { ok: true };
}
