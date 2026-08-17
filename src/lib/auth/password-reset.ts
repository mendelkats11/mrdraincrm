import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { getEmailProvider } from "@/lib/email";
import { hashPassword } from "./password";
import { revokeAllUserSessions } from "./session-store";
import { normalizeEmail } from "./rate-limit";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour — docs/IMPLEMENTATION_PLAN.md §8

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Always behaves identically whether or not the email is registered — no
 * branch, timing difference, or return value reveals account existence to
 * the caller. The email is only actually sent (dev: logged to console)
 * when a matching, non-disabled account exists.
 */
export async function requestPasswordReset<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  email: string,
  appUrl: string,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

  if (!user || user.disabledAt) {
    return;
  }

  const token = generateToken();
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  await recordActivity(db, {
    actorUserId: user.id,
    entityType: "user",
    entityId: user.id,
    action: "password_reset_requested",
  });

  const resetUrl = `${appUrl}/reset-password/${token}`;
  await getEmailProvider().send({
    to: user.email,
    subject: "Reset your Mr. Drain password",
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
  });
}

export type ResetPasswordResult = { ok: true } | { ok: false; reason: "invalid_or_expired_token" };

export async function resetPassword<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  token: string,
  newPassword: string,
): Promise<ResetPasswordResult> {
  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: "invalid_or_expired_token" };
  }

  const newHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, row.userId));
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, row.id));
  // A reset invalidates every existing session, on this device and any
  // other — the credential a stolen session might have been obtained
  // under is no longer valid, so the sessions built on it shouldn't be
  // either.
  await revokeAllUserSessions(db, row.userId);
  await recordActivity(db, {
    actorUserId: row.userId,
    entityType: "user",
    entityId: row.userId,
    action: "password_reset_completed",
  });

  return { ok: true };
}
