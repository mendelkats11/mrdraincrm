"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { createPortfolioJob, deletePortfolioJob, updatePortfolioJob } from "./portfolio-jobs";

export type JobActionResult =
  { ok: true; id?: string; slug?: string } | { ok: false; error: string };

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

/** Creates a job with just a title and a cover photo (already-uploaded
 *  media-library key from MediaPicker) — matches the rest of this CMS's
 *  "simple form, detail later" shape (docs/CLAUDE.md §7). Tags/description
 *  are added afterwards via the inline editor, not at creation time. */
export async function createPortfolioJobAction(
  title: string,
  coverImageKey: string,
): Promise<JobActionResult> {
  const session = await requireUser();
  const parsedTitle = z.string().trim().min(1).max(200).safeParse(title);
  const parsedKey = z.string().trim().min(1).safeParse(coverImageKey);
  if (!parsedTitle.success) return { ok: false, error: "Title is required." };
  if (!parsedKey.success) return { ok: false, error: "Choose a cover photo." };

  const db = getDb();
  const job = await createPortfolioJob(
    db,
    { title: parsedTitle.data, coverImageKey: parsedKey.data },
    session.user.id,
  );
  revalidateJobPaths();
  return { ok: true, id: job.id, slug: job.slug };
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
