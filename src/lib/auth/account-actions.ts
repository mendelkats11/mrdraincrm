"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "./require-user";
import { updateDisplayName, updateEmail, changePassword } from "./account";
import { SESSION_COOKIE_NAME } from "./session-token";

export type AccountFormState = { ok: true } | { ok: false; error: string } | undefined;

const displayNameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
});

export async function updateDisplayNameAction(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const session = await requireUser();
  const parsed = displayNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await updateDisplayName(db, session.user.id, parsed.data.name);
  if (!result.ok) return { ok: false, error: "Something went wrong." };

  revalidatePath("/", "layout");
  return { ok: true };
}

const emailSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newEmail: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
});

export async function updateEmailAction(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const session = await requireUser();
  const parsed = emailSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newEmail: formData.get("newEmail"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await updateEmail(
    db,
    session.user.id,
    parsed.data.currentPassword,
    parsed.data.newEmail,
  );
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error === "incorrect_password"
          ? "Current password is incorrect."
          : "That email is already in use.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export type ChangePasswordFormState =
  { ok: true; redirectTo: string } | { ok: false; error: string } | undefined;

/** Unlike display name/email, a successful password change signs the
 *  current device out too (changePassword revokes every session — see
 *  src/lib/auth/account.ts) — the caller must redirect to /login. */
export async function changePasswordAction(
  _prevState: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  const session = await requireUser();
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await changePassword(
    db,
    session.user.id,
    parsed.data.currentPassword,
    parsed.data.newPassword,
  );
  if (!result.ok) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  revalidatePath("/", "layout");
  return { ok: true, redirectTo: "/login" };
}
