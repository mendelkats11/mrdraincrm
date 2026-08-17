"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { normalizePhone } from "@/lib/phone";
import { dollarsToCents } from "@/lib/money";
import {
  addJobCustomCharge,
  changeJobStatus,
  createJob,
  removeJobCustomCharge,
  updateJob,
  updateJobFinancials,
} from "./jobs";

const uuidOrEmpty = z.union([z.literal(""), z.string().uuid()]);
const phoneField = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || normalizePhone(v) !== null, "Enter a valid phone number");
const emailField = z.union([z.literal(""), z.string().trim().email("Enter a valid email address")]);
const moneyField = z.string().trim().optional();

const createJobSchema = z.object({
  contactId: uuidOrEmpty.optional(),
  newContactDisplayName: z.string().trim().optional(),
  newContactPhone: phoneField,
  newContactEmail: emailField.optional(),
  propertyId: uuidOrEmpty.optional(),
  organizationId: uuidOrEmpty.optional(),
  serviceId: uuidOrEmpty.optional(),
  issueDescription: z.string().trim().optional(),
  emergency: z.union([z.literal("on"), z.literal("")]).optional(),
  status: z.enum(["draft", "open", "scheduled", "in_progress", "completed", "cancelled"]),
  internalNotes: z.string().trim().optional(),
  jobAmount: moneyField,
  taxAmount: moneyField,
  materials: moneyField,
  contractorPayout: moneyField,
});

export type JobFormState = { ok: true; jobId: string } | { ok: false; error: string } | undefined;

export async function createJobAction(
  _prevState: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const session = await requireUser();
  const parsed = createJobSchema.safeParse({
    contactId: formData.get("contactId") || undefined,
    newContactDisplayName: formData.get("newContactDisplayName") || undefined,
    newContactPhone: formData.get("newContactPhone") || undefined,
    newContactEmail: formData.get("newContactEmail") || undefined,
    propertyId: formData.get("propertyId") || undefined,
    organizationId: formData.get("organizationId") || undefined,
    serviceId: formData.get("serviceId") || undefined,
    issueDescription: formData.get("issueDescription") || undefined,
    emergency: formData.get("emergency") || undefined,
    status: formData.get("status") || "draft",
    internalNotes: formData.get("internalNotes") || undefined,
    jobAmount: formData.get("jobAmount") || undefined,
    taxAmount: formData.get("taxAmount") || undefined,
    materials: formData.get("materials") || undefined,
    contractorPayout: formData.get("contractorPayout") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const job = await createJob(
    db,
    {
      contactId: parsed.data.contactId || null,
      newContact: parsed.data.newContactDisplayName
        ? {
            displayName: parsed.data.newContactDisplayName,
            phone: parsed.data.newContactPhone ? normalizePhone(parsed.data.newContactPhone) : null,
            email: parsed.data.newContactEmail || null,
          }
        : null,
      propertyId: parsed.data.propertyId || null,
      organizationId: parsed.data.organizationId || null,
      serviceId: parsed.data.serviceId || null,
      issueDescription: parsed.data.issueDescription || null,
      emergency: parsed.data.emergency === "on",
      internalNotes: parsed.data.internalNotes || null,
      status: parsed.data.status,
      jobAmountCents: parsed.data.jobAmount ? dollarsToCents(parsed.data.jobAmount) : 0,
      taxAmountCents: parsed.data.taxAmount ? dollarsToCents(parsed.data.taxAmount) : 0,
      materialsCents: parsed.data.materials ? dollarsToCents(parsed.data.materials) : 0,
      contractorPayoutCents: parsed.data.contractorPayout
        ? dollarsToCents(parsed.data.contractorPayout)
        : 0,
    },
    session.user.id,
  );

  revalidatePath("/jobs");
  return { ok: true, jobId: job.id };
}

const updateJobSchema = z.object({
  jobId: z.string().uuid(),
  contactId: uuidOrEmpty.optional(),
  propertyId: uuidOrEmpty.optional(),
  organizationId: uuidOrEmpty.optional(),
  serviceId: uuidOrEmpty.optional(),
  issueDescription: z.string().trim().optional(),
  emergency: z.union([z.literal("on"), z.literal("")]).optional(),
  internalNotes: z.string().trim().optional(),
});

export async function updateJobAction(
  _prevState: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const session = await requireUser();
  const parsed = updateJobSchema.safeParse({
    jobId: formData.get("jobId"),
    contactId: formData.get("contactId") || undefined,
    propertyId: formData.get("propertyId") || undefined,
    organizationId: formData.get("organizationId") || undefined,
    serviceId: formData.get("serviceId") || undefined,
    issueDescription: formData.get("issueDescription") || undefined,
    emergency: formData.get("emergency") || undefined,
    internalNotes: formData.get("internalNotes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  await updateJob(
    db,
    parsed.data.jobId,
    {
      contactId: parsed.data.contactId || null,
      propertyId: parsed.data.propertyId || null,
      organizationId: parsed.data.organizationId || null,
      serviceId: parsed.data.serviceId || null,
      issueDescription: parsed.data.issueDescription || null,
      emergency: parsed.data.emergency === "on",
      internalNotes: parsed.data.internalNotes || null,
    },
    session.user.id,
  );

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${parsed.data.jobId}`);
  return { ok: true, jobId: parsed.data.jobId };
}

const updateFinancialsSchema = z.object({
  jobId: z.string().uuid(),
  jobAmount: moneyField,
  taxAmount: moneyField,
  materials: moneyField,
  contractorPayout: moneyField,
});

export async function updateJobFinancialsAction(
  _prevState: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const session = await requireUser();
  const parsed = updateFinancialsSchema.safeParse({
    jobId: formData.get("jobId"),
    jobAmount: formData.get("jobAmount") || undefined,
    taxAmount: formData.get("taxAmount") || undefined,
    materials: formData.get("materials") || undefined,
    contractorPayout: formData.get("contractorPayout") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  await updateJobFinancials(
    db,
    parsed.data.jobId,
    {
      jobAmountCents: dollarsToCents(parsed.data.jobAmount || "0"),
      taxAmountCents: dollarsToCents(parsed.data.taxAmount || "0"),
      materialsCents: dollarsToCents(parsed.data.materials || "0"),
      contractorPayoutCents: dollarsToCents(parsed.data.contractorPayout || "0"),
    },
    session.user.id,
  );

  revalidatePath(`/jobs/${parsed.data.jobId}`);
  return { ok: true, jobId: parsed.data.jobId };
}

const statusSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(["draft", "open", "scheduled", "in_progress", "completed", "cancelled"]),
});

export type SimpleFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function changeJobStatusAction(
  _prevState: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const session = await requireUser();
  const parsed = statusSchema.safeParse({
    jobId: formData.get("jobId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await changeJobStatus(db, parsed.data.jobId, parsed.data.status, session.user.id);
  if (!result.ok) {
    return { ok: false, error: "Job could not be found." };
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${parsed.data.jobId}`);
  return { ok: true };
}

const addChargeSchema = z.object({
  jobId: z.string().uuid(),
  description: z.string().trim().min(1, "Description is required"),
  amount: z.string().trim().min(1, "Amount is required"),
});

export async function addJobCustomChargeAction(
  _prevState: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const session = await requireUser();
  const parsed = addChargeSchema.safeParse({
    jobId: formData.get("jobId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  await addJobCustomCharge(
    db,
    parsed.data.jobId,
    parsed.data.description,
    dollarsToCents(parsed.data.amount),
    session.user.id,
  );

  revalidatePath(`/jobs/${parsed.data.jobId}`);
  return { ok: true };
}

export async function removeJobCustomChargeAction(jobId: string, chargeId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await removeJobCustomCharge(db, jobId, chargeId, session.user.id);
  revalidatePath(`/jobs/${jobId}`);
}
