"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { setOwnerCallbackPhoneNumber } from "@/lib/callrail/callback";
import { normalizePhone } from "@/lib/phone";

export type CallbackPhoneFormState = { ok: true } | { ok: false; error: string } | undefined;

const schema = z.object({
  phoneNumber: z.string().trim().max(32).optional(),
});

export async function updateCallbackPhoneAction(
  _prevState: CallbackPhoneFormState,
  formData: FormData,
): Promise<CallbackPhoneFormState> {
  const session = await requireUser();
  const parsed = schema.safeParse({ phoneNumber: formData.get("phoneNumber") || undefined });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let e164: string | null = null;
  if (parsed.data.phoneNumber) {
    const normalized = normalizePhone(parsed.data.phoneNumber);
    if (!normalized) return { ok: false, error: "Enter a valid phone number." };
    e164 = normalized.e164;
  }

  const db = getDb();
  await setOwnerCallbackPhoneNumber(db, e164, session.user.id);

  revalidatePath("/settings");
  return { ok: true };
}
