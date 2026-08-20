"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { updateServiceAreaTrackingNumber } from "./service-areas";

const schema = z.object({
  serviceAreaId: z.string().uuid(),
  trackingNumber: z.string().trim().optional(),
});

export type UpdateTrackingNumberFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function updateServiceAreaTrackingNumberAction(
  _prevState: UpdateTrackingNumberFormState,
  formData: FormData,
): Promise<UpdateTrackingNumberFormState> {
  const session = await requireUser();
  const parsed = schema.safeParse({
    serviceAreaId: formData.get("serviceAreaId"),
    trackingNumber: formData.get("trackingNumber") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await updateServiceAreaTrackingNumber(
    db,
    parsed.data.serviceAreaId,
    parsed.data.trackingNumber || null,
    session.user.id,
  );
  if (!result.ok) return { ok: false, error: "Service area not found." };

  revalidatePath("/calls/tracking-numbers");
  return { ok: true };
}
