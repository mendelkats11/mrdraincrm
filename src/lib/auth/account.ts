import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { users } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { hashPassword, verifyPassword } from "./password";
import { revokeAllUserSessions } from "./session-store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export type UpdateDisplayNameResult = { ok: true } | { ok: false; error: "not_found" };

/** Low-risk, cosmetic — no current-password check, unlike email/password below. */
export async function updateDisplayName<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  userId: string,
  name: string,
): Promise<UpdateDisplayNameResult> {
  const [before] = await db.select().from(users).where(eq(users.id, userId));
  if (!before) return { ok: false, error: "not_found" };

  await db.transaction(async (tx) => {
    await tx.update(users).set({ name }).where(eq(users.id, userId));
    await recordActivity(tx, {
      actorUserId: userId,
      entityType: "user",
      entityId: userId,
      action: "display_name_changed",
      oldValue: { name: before.name },
      newValue: { name },
    });
  });

  return { ok: true };
}

export type UpdateEmailResult =
  { ok: true } | { ok: false; error: "incorrect_password" | "email_taken" };

/** Requires the current password — an email change is effectively a login
 *  credential change (it's what you sign in with), same trust boundary as
 *  changePassword below. */
export async function updateEmail<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  userId: string,
  currentPassword: string,
  newEmail: string,
): Promise<UpdateEmailResult> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    return { ok: false, error: "incorrect_password" };
  }

  const normalized = newEmail.trim().toLowerCase();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalized));
  if (existing && existing.id !== userId) {
    return { ok: false, error: "email_taken" };
  }

  await db.transaction(async (tx) => {
    await tx.update(users).set({ email: normalized }).where(eq(users.id, userId));
    await recordActivity(tx, {
      actorUserId: userId,
      entityType: "user",
      entityId: userId,
      action: "email_changed",
      oldValue: { email: user.email },
      newValue: { email: normalized },
    });
  });

  return { ok: true };
}

export type ChangePasswordResult = { ok: true } | { ok: false; error: "incorrect_password" };

export async function changePassword<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    return { ok: false, error: "incorrect_password" };
  }

  const newHash = await hashPassword(newPassword);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));
    await recordActivity(tx, {
      actorUserId: userId,
      entityType: "user",
      entityId: userId,
      action: "password_changed",
    });
    // Same reasoning as a reset-password completion (src/lib/auth/
    // password-reset.ts): every existing session was issued under the old
    // credential, so all but the session performing this change should be
    // treated as no longer trustworthy. The caller is responsible for
    // re-issuing a fresh session for the current device after this.
    await revokeAllUserSessions(tx, userId);
  });

  return { ok: true };
}
