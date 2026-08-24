"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { createContactFromCall, createLeadFromCall, ignoreCall } from "./calls";
import { initiateCallback } from "./callback";

export type CallMutationFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function ignoreCallAction(callId: string): Promise<CallMutationFormState> {
  const session = await requireUser();
  const db = getDb();
  const result = await ignoreCall(db, callId, session.user.id);
  if (!result.ok) return { ok: false, error: "Call not found." };

  revalidatePath("/calls");
  revalidatePath(`/calls/${callId}`);
  return { ok: true };
}

const createContactFromCallSchema = z.object({
  callId: z.string().uuid(),
  displayName: z.string().trim().min(1, "Name is required"),
});

export type CreateContactFromCallFormState =
  { ok: true; contactId: string } | { ok: false; error: string } | undefined;

export async function createContactFromCallAction(
  _prevState: CreateContactFromCallFormState,
  formData: FormData,
): Promise<CreateContactFromCallFormState> {
  const session = await requireUser();
  const parsed = createContactFromCallSchema.safeParse({
    callId: formData.get("callId"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await createContactFromCall(
    db,
    parsed.data.callId,
    { displayName: parsed.data.displayName },
    session.user.id,
  );
  if (!result.ok) {
    const messages = {
      not_found: "Call not found.",
      unparseable_phone: "This call's phone number couldn't be parsed.",
    };
    return { ok: false, error: messages[result.error] };
  }

  revalidatePath("/calls");
  revalidatePath(`/calls/${parsed.data.callId}`);
  return { ok: true, contactId: result.contactId };
}

const createLeadFromCallSchema = z.object({
  callId: z.string().uuid(),
  displayName: z.string().trim().min(1, "Name is required"),
  issueDescription: z.string().trim().optional(),
  emergency: z.string().optional(),
});

export type CreateLeadFromCallFormState =
  { ok: true; leadId: string } | { ok: false; error: string } | undefined;

export async function createLeadFromCallAction(
  _prevState: CreateLeadFromCallFormState,
  formData: FormData,
): Promise<CreateLeadFromCallFormState> {
  const session = await requireUser();
  const parsed = createLeadFromCallSchema.safeParse({
    callId: formData.get("callId"),
    displayName: formData.get("displayName"),
    issueDescription: formData.get("issueDescription") || undefined,
    emergency: formData.get("emergency") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await createLeadFromCall(
    db,
    parsed.data.callId,
    {
      displayName: parsed.data.displayName,
      issueDescription: parsed.data.issueDescription || null,
      emergency: parsed.data.emergency === "on",
    },
    session.user.id,
  );
  if (!result.ok) {
    const messages = {
      not_found: "Call not found.",
      unparseable_phone: "This call's phone number couldn't be parsed.",
    };
    return { ok: false, error: messages[result.error] };
  }

  revalidatePath("/calls");
  revalidatePath(`/calls/${parsed.data.callId}`);
  revalidatePath("/leads");
  return { ok: true, leadId: result.leadId };
}

export type CallBackFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function callBackAction(callId: string): Promise<CallBackFormState> {
  const session = await requireUser();
  const zCallId = z.string().uuid().safeParse(callId);
  if (!zCallId.success) return { ok: false, error: "Invalid call." };

  const db = getDb();
  const result = await initiateCallback(db, zCallId.data, session.user.id);
  if (!result.ok) {
    if (result.error === "not_found") return { ok: false, error: "Call not found." };
    return { ok: false, error: result.message ?? "Callback failed." };
  }

  return { ok: true };
}
