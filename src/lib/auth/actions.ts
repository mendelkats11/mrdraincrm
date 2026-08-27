"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { recordActivity } from "@/lib/audit/activity";
import { loginWithPassword } from "./login";
import { requestPasswordReset, resetPassword } from "./password-reset";
import { acceptInvite } from "./invites";
import { getCurrentSession } from "./require-user";
import { revokeAllUserSessions, revokeSession } from "./session-store";
import { SESSION_COOKIE_NAME } from "./session-token";

function getAppUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

async function getRequestMeta() {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  return {
    userAgent: h.get("user-agent"),
    ipAddress: forwardedFor?.split(",")[0]?.trim() || h.get("x-real-ip") || null,
  };
}

async function setSessionCookie(cookieValue: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    // Cookies with `secure: true` are dropped by browsers over plain
    // http:// — except on the `localhost` origin itself, which browsers
    // treat as a secure context. Gating on NODE_ENV keeps local dev
    // working without weakening the production cookie.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// ---- Login ----------------------------------------------------------

const loginSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export type LoginFormState = { error?: string; redirectTo?: string } | undefined;

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const db = getDb();
  const meta = await getRequestMeta();
  const result = await loginWithPassword(db, parsed.data.email, parsed.data.password, meta);

  if (!result.ok) {
    return {
      error:
        result.reason === "rate_limited"
          ? "Too many attempts. Try again in a few minutes."
          : "Invalid email or password.",
    };
  }

  await setSessionCookie(result.session.cookieValue, result.session.expiresAt);

  // Deliberately NOT calling next/navigation's redirect() here. The
  // destination ("/", or `next`) is very likely a path this same browser
  // tab already visited *while signed out* — that's the normal shape of
  // the very first login of a session (redirected to /login from "/",
  // then straight back to "/" on success). Next.js's client Router Cache
  // is keyed by pathname only and doesn't know that "/" renders different
  // content depending on the session cookie, so a soft client-side
  // transition after redirect() can silently reuse that stale
  // signed-out-content cache entry. Confirmed empirically while testing
  // this phase: after a successful login, the client repainted the
  // signed-out "/" content with zero network request for the destination
  // — an explicit revalidatePath("/", "layout") call before the redirect
  // did not prevent it. Returning redirectTo and having the client do a
  // real `window.location` navigation (see login-form.tsx) forces a full
  // document load, which always asks the server fresh regardless of any
  // client-side cache.
  const next = parsed.data.next;
  return { redirectTo: next && next.startsWith("/") && !next.startsWith("//") ? next : "/" };
}

// ---- Logout -----------------------------------------------------------

export type LogoutActionState = { redirectTo: string } | undefined;

export async function logoutAction(): Promise<LogoutActionState> {
  const session = await getCurrentSession();
  if (session) {
    const db = getDb();
    await revokeSession(db, session.sessionId);
    await recordActivity(db, {
      actorUserId: session.user.id,
      entityType: "user",
      entityId: session.user.id,
      action: "logout",
    });
  }
  await clearSessionCookie();
  // revalidatePath is real defense-in-depth for server-side caches, but
  // — per the finding documented in loginAction above — is not on its own
  // sufficient to guarantee the client won't repaint a stale Router Cache
  // entry. That's a strictly worse direction to get wrong here than on
  // login (it would mean flashing protected content to a signed-out
  // session), so this path gets the same forced hard-navigation treatment
  // rather than relying on redirect() alone. See logout-button.tsx.
  revalidatePath("/", "layout");
  return { redirectTo: "/login" };
}

export async function logoutAllDevicesAction(): Promise<LogoutActionState> {
  const session = await getCurrentSession();
  if (session) {
    const db = getDb();
    await revokeAllUserSessions(db, session.user.id);
    await recordActivity(db, {
      actorUserId: session.user.id,
      entityType: "user",
      entityId: session.user.id,
      action: "logout_all_devices",
    });
  }
  await clearSessionCookie();
  revalidatePath("/", "layout");
  return { redirectTo: "/login" };
}

// ---- Forgot password ----------------------------------------------------

const forgotPasswordSchema = z.object({ email: z.string().trim().min(1).email() });

export type ForgotPasswordFormState = { submitted?: boolean; error?: string } | undefined;

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordFormState,
  formData: FormData,
): Promise<ForgotPasswordFormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  const db = getDb();
  const meta = await getRequestMeta();
  const result = await requestPasswordReset(db, parsed.data.email, getAppUrl(), meta.ipAddress);

  if (!result.ok) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  // Identical response whether or not the email is registered — see
  // src/lib/auth/password-reset.ts.
  return { submitted: true };
}

// ---- Reset password -----------------------------------------------------

const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormState = { error?: string } | undefined;

export async function resetPasswordAction(
  _prevState: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await resetPassword(db, parsed.data.token, parsed.data.password);
  if (!result.ok) {
    return { error: "This reset link is invalid or has expired." };
  }

  redirect("/login?reset=success");
}

// ---- Accept invite --------------------------------------------------------

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(1, "Name is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type AcceptInviteFormState = { error?: string } | undefined;

export async function acceptInviteAction(
  _prevState: AcceptInviteFormState,
  formData: FormData,
): Promise<AcceptInviteFormState> {
  const parsed = acceptInviteSchema.safeParse({
    token: formData.get("token"),
    name: formData.get("name"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await acceptInvite(db, parsed.data.token, parsed.data.name, parsed.data.password);
  if (!result.ok) {
    return {
      error:
        result.reason === "email_already_registered"
          ? "An account with this email already exists."
          : "This invite link is invalid or has expired.",
    };
  }

  redirect("/login?invite=accepted");
}
