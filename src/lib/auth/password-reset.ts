import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { sendTrackedEmail } from "@/lib/email/send-tracked-email";
import { hashPassword } from "./password";
import { revokeAllUserSessions } from "./session-store";
import {
  PASSWORD_RESET_ATTEMPT_EMAIL_ENTITY_TYPE,
  PASSWORD_RESET_ATTEMPT_IP_ENTITY_TYPE,
  PASSWORD_RESET_ATTEMPT_ACTION,
  PASSWORD_RESET_MAX_ATTEMPTS,
  countRecentPasswordResetAttempts,
  deterministicIdFrom,
  normalizeEmail,
} from "./rate-limit";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour — docs/IMPLEMENTATION_PLAN.md §8

// A floor under the whole request-reset call, regardless of which branch it
// takes. The registered-account branch does real work a nonexistent-account
// branch doesn't (a token insert, an activity record, an email-provider
// round-trip) — left alone, that gap is a timing side-channel an attacker
// could use to enumerate registered emails even though the *response body*
// is identical either way. Padding every call out to the same minimum
// wall-clock time caps the observable difference to noise.
const MIN_RESPONSE_TIME_MS = 400;

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type RequestPasswordResetResult = { ok: true } | { ok: false; reason: "rate_limited" };

/**
 * Always behaves identically whether or not the email is registered — no
 * branch, return value, or (modulo the MIN_RESPONSE_TIME_MS floor above)
 * timing reveals account existence to the caller. The email is only
 * actually sent (dev: logged to console) when a matching, non-disabled
 * account exists. Rate limited the same way login is — dual email+IP
 * counters backed by the `activities` table (src/lib/auth/rate-limit.ts) —
 * so this can't be used to mail-bomb one address or exhaust storage.
 */
export async function requestPasswordReset<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  email: string,
  appUrl: string,
  ipAddress?: string | null,
): Promise<RequestPasswordResetResult> {
  const startedAt = Date.now();
  const result = await requestPasswordResetInner(db, email, appUrl, ipAddress);

  const elapsed = Date.now() - startedAt;
  if (elapsed < MIN_RESPONSE_TIME_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_RESPONSE_TIME_MS - elapsed));
  }
  return result;
}

async function requestPasswordResetInner<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  email: string,
  appUrl: string,
  ipAddress?: string | null,
): Promise<RequestPasswordResetResult> {
  const normalizedEmail = normalizeEmail(email);
  const emailEntityId = deterministicIdFrom(normalizedEmail);
  const ipEntityId = ipAddress ? deterministicIdFrom(ipAddress) : null;

  const emailAttempts = await countRecentPasswordResetAttempts(
    db,
    PASSWORD_RESET_ATTEMPT_EMAIL_ENTITY_TYPE,
    emailEntityId,
  );
  const ipAttempts = ipEntityId
    ? await countRecentPasswordResetAttempts(db, PASSWORD_RESET_ATTEMPT_IP_ENTITY_TYPE, ipEntityId)
    : 0;
  if (emailAttempts >= PASSWORD_RESET_MAX_ATTEMPTS || ipAttempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
    return { ok: false, reason: "rate_limited" };
  }

  // Counts every request, valid or not, before doing anything else — same
  // shape as the public lead-submission limiter.
  await recordActivity(db, {
    entityType: PASSWORD_RESET_ATTEMPT_EMAIL_ENTITY_TYPE,
    entityId: emailEntityId,
    action: PASSWORD_RESET_ATTEMPT_ACTION,
  });
  if (ipEntityId) {
    await recordActivity(db, {
      entityType: PASSWORD_RESET_ATTEMPT_IP_ENTITY_TYPE,
      entityId: ipEntityId,
      action: PASSWORD_RESET_ATTEMPT_ACTION,
    });
  }

  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

  if (!user || user.disabledAt) {
    return { ok: true };
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
  await sendTrackedEmail(db, {
    to: user.email,
    subject: "Reset your Mr. Drain password",
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
    template: "password_reset",
    relatedEntityType: "user",
    relatedEntityId: user.id,
  });

  return { ok: true };
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
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash: newHash }).where(eq(users.id, row.userId));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, row.id));
    // A reset invalidates every existing session, on this device and any
    // other — the credential a stolen session might have been obtained
    // under is no longer valid, so the sessions built on it shouldn't be
    // either.
    await revokeAllUserSessions(tx, row.userId);
    await recordActivity(tx, {
      actorUserId: row.userId,
      entityType: "user",
      entityId: row.userId,
      action: "password_reset_completed",
    });
  });

  return { ok: true };
}
