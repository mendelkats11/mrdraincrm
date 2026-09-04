"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { createPortfolioJob, deletePortfolioJob, updatePortfolioJob } from "./portfolio-jobs";
import { generateJobTitle } from "./generate-job-title";

export type JobActionResult =
  { ok: true; id?: string; slug?: string; title?: string } | { ok: false; error: string };

const uuidOrEmpty = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

function revalidateJobPaths() {
  revalidatePath("/website/editor");
  revalidatePath("/gallery");
  revalidatePath("/");
}

/** Creates a job from just a cover photo (already-uploaded media-library
 *  key from MediaPicker) — matches the rest of this CMS's "simple form,
 *  detail later" shape (docs/CLAUDE.md §7). The title is auto-generated
 *  (see generateJobTitle) rather than typed, so adding a job is genuinely
 *  just "pick a photo" — still fully renameable afterward via the visual
 *  editor's click-to-edit title, and tags/description are added afterward
 *  the same way they always were. */
export async function createPortfolioJobAction(coverImageKey: string): Promise<JobActionResult> {
  const session = await requireUser();
  const parsedKey = z.string().trim().min(1).safeParse(coverImageKey);
  if (!parsedKey.success) return { ok: false, error: "Choose a cover photo." };

  const db = getDb();
  const job = await createPortfolioJob(
    db,
    { title: generateJobTitle(), coverImageKey: parsedKey.data },
    session.user.id,
  );
  revalidateJobPaths();
  return { ok: true, id: job.id, slug: job.slug, title: job.title };
}

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(3000).optional(),
  })
  .strict();

/** The visual editor's click-on-the-text save path for a job's title/
 *  description — same shape and same guardrail reasoning as
 *  patchHomepageSectionConfigAction: a fixed, `.strict()` schema, so an
 *  inline edit can only ever write to a field this form already has a
 *  defined shape for. */
export async function patchPortfolioJobAction(
  jobId: string,
  patch: Record<string, unknown>,
): Promise<JobActionResult> {
  const session = await requireUser();
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  if (Object.keys(parsed.data).length === 0) {
    return { ok: false, error: "Nothing to save." };
  }

  const db = getDb();
  await updatePortfolioJob(db, jobId, parsed.data, session.user.id);
  revalidateJobPaths();
  return { ok: true };
}

export async function setPortfolioJobCoverAction(
  jobId: string,
  coverImageKey: string,
): Promise<JobActionResult> {
  const session = await requireUser();
  const db = getDb();
  await updatePortfolioJob(db, jobId, { coverImageKey }, session.user.id);
  revalidateJobPaths();
  return { ok: true };
}

export async function setPortfolioJobTagsAction(
  jobId: string,
  serviceId: string,
  serviceAreaId: string,
): Promise<JobActionResult> {
  const session = await requireUser();
  const parsedService = uuidOrEmpty.safeParse(serviceId);
  const parsedArea = uuidOrEmpty.safeParse(serviceAreaId);
  const db = getDb();
  await updatePortfolioJob(
    db,
    jobId,
    {
      serviceId: parsedService.success ? (parsedService.data ?? null) : null,
      serviceAreaId: parsedArea.success ? (parsedArea.data ?? null) : null,
    },
    session.user.id,
  );
  revalidateJobPaths();
  return { ok: true };
}

export async function setPortfolioJobHiddenAction(jobId: string, hidden: boolean): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await updatePortfolioJob(db, jobId, { hidden }, session.user.id);
  revalidateJobPaths();
}

export async function setPortfolioJobFeaturedAction(
  jobId: string,
  featured: boolean,
): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await updatePortfolioJob(db, jobId, { featured }, session.user.id);
  revalidateJobPaths();
}

export async function reorderPortfolioJobAction(jobId: string, sortOrder: number): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await updatePortfolioJob(db, jobId, { sortOrder }, session.user.id);
  revalidateJobPaths();
}

export async function deletePortfolioJobAction(jobId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await deletePortfolioJob(db, jobId, session.user.id);
  revalidateJobPaths();
}
