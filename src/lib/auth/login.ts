import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { users } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { getDummyPasswordHash, verifyPassword } from "./password";
import { type CreatedSession, type CreateSessionMeta, createSession } from "./session-store";
import {
  LOGIN_ATTEMPT_EMAIL_ENTITY_TYPE,
  LOGIN_ATTEMPT_IP_ENTITY_TYPE,
  RATE_LIMIT_MAX_ATTEMPTS,
  countRecentFailedLogins,
  deterministicIdFrom,
  normalizeEmail,
} from "./rate-limit";

export type LoginResult =
  | { ok: true; session: CreatedSession }
  | { ok: false; reason: "invalid_credentials" | "rate_limited" };

/**
 * Deliberately returns the *same* `invalid_credentials` reason for a
 * nonexistent email, a wrong password, and a disabled account — the
 * caller must show one generic message for all three (docs/CLAUDE.md
 * §2/§5: don't leak which emails are registered). `rate_limited` is safe
 * to distinguish in the UI since it's shown identically regardless of
 * whether the targeted email exists.
 */
export async function loginWithPassword<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  email: string,
  password: string,
  meta: CreateSessionMeta = {},
): Promise<LoginResult> {
  const normalizedEmail = normalizeEmail(email);
  const emailEntityId = deterministicIdFrom(normalizedEmail);
  const ipEntityId = meta.ipAddress ? deterministicIdFrom(meta.ipAddress) : null;

  const emailAttempts = await countRecentFailedLogins(
    db,
    LOGIN_ATTEMPT_EMAIL_ENTITY_TYPE,
    emailEntityId,
  );
  const ipAttempts = ipEntityId
    ? await countRecentFailedLogins(db, LOGIN_ATTEMPT_IP_ENTITY_TYPE, ipEntityId)
    : 0;

  if (emailAttempts >= RATE_LIMIT_MAX_ATTEMPTS || ipAttempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    await recordActivity(db, {
      entityType: LOGIN_ATTEMPT_EMAIL_ENTITY_TYPE,
      entityId: emailEntityId,
      action: "login_rate_limited",
      metadata: { email: normalizedEmail },
    });
    return { ok: false, reason: "rate_limited" };
  }

  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

  // Always run the (deliberately slow) argon2 verify step, even for a
  // nonexistent user, against a fixed dummy hash — keeps response timing
  // indistinguishable between "wrong password" and "no such account."
  const passwordMatches = user
    ? await verifyPassword(user.passwordHash, password)
    : await verifyPassword(await getDummyPasswordHash(), password);

  const failed = !user || !passwordMatches || Boolean(user.disabledAt);

  if (failed) {
    // Two rows per failed attempt, keyed differently, so both a
    // single-email brute force and a single-IP spray across many emails
    // get rate limited — see src/lib/auth/rate-limit.ts.
    await recordActivity(db, {
      actorUserId: user?.id ?? null,
      entityType: LOGIN_ATTEMPT_EMAIL_ENTITY_TYPE,
      entityId: emailEntityId,
      action: "login_failed",
      metadata: { email: normalizedEmail },
    });
    if (ipEntityId) {
      await recordActivity(db, {
        actorUserId: user?.id ?? null,
        entityType: LOGIN_ATTEMPT_IP_ENTITY_TYPE,
        entityId: ipEntityId,
        action: "login_failed",
        metadata: { email: normalizedEmail },
      });
    }
    return { ok: false, reason: "invalid_credentials" };
  }

  const session = await createSession(db, user.id, meta);
  await recordActivity(db, {
    actorUserId: user.id,
    entityType: "user",
    entityId: user.id,
    action: "login_succeeded",
    metadata: { email: normalizedEmail },
  });

  return { ok: true, session };
}
