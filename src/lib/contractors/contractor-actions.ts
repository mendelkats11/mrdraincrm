"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { normalizePhone } from "@/lib/phone";
import { formatTimeRange } from "@/lib/schedule/format";
import { jobs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createContractor, searchContractors } from "./contractors";
import { assignContractor, checkContractorConflict, unassignContractor } from "./assignments";

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
});

export type ContractorFormState =
  | { ok: true; contractorId: string; contractorName: string }
  | { ok: false; error: string }
  | undefined;

/** Quick-create only — name/phone/email, per the approved Phase 6 scope.
 *  The row it creates is a normal `contractors` record Phase 7 will later
 *  manage fully. */
export async function createContractorAction(
  _prevState: ContractorFormState,
  formData: FormData,
): Promise<ContractorFormState> {
  const session = await requireUser();
  const parsed = createContractorSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
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
    },
    session.user.id,
  );

  return { ok: true, contractorId: contractor.id, contractorName: contractor.name };
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
