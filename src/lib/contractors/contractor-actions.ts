"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { normalizePhone } from "@/lib/phone";
import { formatTimeRange } from "@/lib/schedule/format";
import { jobs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createContractor,
  searchContractors,
  setContractorActive,
  updateContractor,
} from "./contractors";
import {
  assignContractor,
  checkContractorConflict,
  getCurrentAssignment,
  unassignContractor,
  updateAssignmentStatus,
  type AssignmentActiveStatus,
} from "./assignments";

const phoneField = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || normalizePhone(v) !== null, "Enter a valid phone number");
const emailField = z.union([z.literal(""), z.string().trim().email("Enter a valid email address")]);

const createContractorSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: phoneField,
  email: emailField.optional(),
  notes: z.string().trim().optional(),
  defaultPayoutArrangement: z.string().trim().optional(),
});

export type ContractorFormState =
  | { ok: true; contractorId: string; contractorName: string }
  | { ok: false; error: string }
  | undefined;

/** Handles both the Phase 6 quick-create (name/phone/email only) and the
 *  full Phase 7 create form — notes/defaultPayoutArrangement simply default
 *  to empty when the caller (e.g. the job page's inline picker) omits them. */
export async function createContractorAction(
  _prevState: ContractorFormState,
  formData: FormData,
): Promise<ContractorFormState> {
  const session = await requireUser();
  const parsed = createContractorSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    notes: formData.get("notes") || undefined,
    defaultPayoutArrangement: formData.get("defaultPayoutArrangement") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const contractor = await createContractor(
    db,
    {
      name: parsed.data.name,
      phone: parsed.data.phone ? normalizePhone(parsed.data.phone) : null,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
      defaultPayoutArrangement: parsed.data.defaultPayoutArrangement || null,
    },
    session.user.id,
  );

  revalidatePath("/contractors");
  return { ok: true, contractorId: contractor.id, contractorName: contractor.name };
}

const updateContractorSchema = z.object({
  contractorId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required"),
  phone: phoneField,
  email: emailField.optional(),
  notes: z.string().trim().optional(),
  defaultPayoutArrangement: z.string().trim().optional(),
});

export async function updateContractorAction(
  _prevState: ContractorFormState,
  formData: FormData,
): Promise<ContractorFormState> {
  const session = await requireUser();
  const parsed = updateContractorSchema.safeParse({
    contractorId: formData.get("contractorId"),
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    notes: formData.get("notes") || undefined,
    defaultPayoutArrangement: formData.get("defaultPayoutArrangement") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const contractor = await updateContractor(
    db,
    parsed.data.contractorId,
    {
      name: parsed.data.name,
      phone: parsed.data.phone ? normalizePhone(parsed.data.phone) : null,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
      defaultPayoutArrangement: parsed.data.defaultPayoutArrangement || null,
    },
    session.user.id,
  );

  revalidatePath("/contractors");
  revalidatePath(`/contractors/${parsed.data.contractorId}`);
  return { ok: true, contractorId: contractor.id, contractorName: contractor.name };
}

export async function setContractorActiveAction(
  contractorId: string,
  active: boolean,
): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await setContractorActive(db, contractorId, active, session.user.id);
  revalidatePath("/contractors");
  revalidatePath(`/contractors/${contractorId}`);
}

export interface ContractorSearchResult {
  id: string;
  name: string;
}

export async function searchContractorsAction(query: string): Promise<ContractorSearchResult[]> {
  await requireUser();
  if (!query.trim()) return [];
  const db = getDb();
  return searchContractors(db, query);
}

export interface ConflictWarning {
  jobNumber: string;
  scheduleSummary: string;
}

/** Read-only check — never blocks anything. The caller decides what to do
 *  with the result (show a warning, let the owner confirm). */
export async function checkContractorConflictAction(
  jobId: string,
  contractorId: string,
): Promise<ConflictWarning | null> {
  await requireUser();
  const db = getDb();

  const [job] = await db
    .select({
      scheduledStart: jobs.scheduledStart,
      scheduledEnd: jobs.scheduledEnd,
      timeTbd: jobs.timeTbd,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId));
  if (!job) return null;

  const conflict = await checkContractorConflict(db, contractorId, job, jobId);
  if (!conflict) return null;

  return {
    jobNumber: conflict.jobNumber,
    scheduleSummary: formatTimeRange({
      scheduledStart: conflict.scheduledStart,
      scheduledEnd: conflict.scheduledEnd,
      timeTbd: false,
    }),
  };
}

export async function assignContractorAction(jobId: string, contractorId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await assignContractor(db, jobId, contractorId, session.user.id);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/schedule");
}

export async function unassignContractorAction(jobId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await unassignContractor(db, jobId, session.user.id);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/schedule");
}

export type UpdateAssignmentStatusFormResult =
  { ok: true } | { ok: false; error: string } | undefined;

export async function updateAssignmentStatusAction(
  jobId: string,
  status: AssignmentActiveStatus,
): Promise<UpdateAssignmentStatusFormResult> {
  const session = await requireUser();
  const db = getDb();
  const result = await updateAssignmentStatus(db, jobId, status, session.user.id);
  if (!result.ok) {
    return { ok: false, error: "No contractor is currently assigned to this job." };
  }
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/contractors");
  const current = await getCurrentAssignment(db, jobId);
  if (current) revalidatePath(`/contractors/${current.contractorId}`);
  return { ok: true };
}
