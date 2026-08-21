"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { updateHomepageSection } from "./homepage";

export type HomepageSectionFormState = { ok: true } | { ok: false; error: string } | undefined;

const configSchema = z.object({
  sectionId: z.string().uuid(),
  active: z.string().optional(),
  limit: z.string().trim().optional(),
  heading: z.string().trim().max(200).optional(),
  body: z.string().trim().max(2000).optional(),
});

/** One form per section on the homepage editor — `limit` only means
 *  anything for the services/gallery/service_areas/reviews section types
 *  (how many items to show), heading/body only for why_mr_drain/cta. Each
 *  section stores only the keys relevant to its own type; unused keys are
 *  simply left out of `config` rather than written as empty strings. */
export async function updateHomepageSectionAction(
  _prevState: HomepageSectionFormState,
  formData: FormData,
): Promise<HomepageSectionFormState> {
  const session = await requireUser();
  const parsed = configSchema.safeParse({
    sectionId: formData.get("sectionId"),
    active: formData.get("active") || undefined,
    limit: formData.get("limit") || undefined,
    heading: formData.get("heading") || undefined,
    body: formData.get("body") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const config: Record<string, unknown> = {};
  if (parsed.data.limit) {
    const limitNum = Number(parsed.data.limit);
    if (Number.isFinite(limitNum) && limitNum > 0) config.limit = Math.floor(limitNum);
  }
  if (parsed.data.heading) config.heading = parsed.data.heading;
  if (parsed.data.body) config.body = parsed.data.body;

  const db = getDb();
  await updateHomepageSection(
    db,
    parsed.data.sectionId,
    { config, active: parsed.data.active === "on" },
    session.user.id,
  );

  revalidatePath("/website/homepage");
  revalidatePath("/");
  return { ok: true };
}

export async function reorderHomepageSectionAction(
  sectionId: string,
  sortOrder: number,
): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await updateHomepageSection(db, sectionId, { sortOrder }, session.user.id);
  revalidatePath("/website/homepage");
  revalidatePath("/");
}
