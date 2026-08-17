import { and, eq, isNull } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { sessions, users } from "@/lib/db/schema";
import {
  createSessionCookieValue,
  generateSessionToken,
  hashSessionToken,
  verifySessionCookieValue,
} from "./session-token";

// 30-day sessions with sliding renewal (extended once less than half the
// lifetime remains on an active request) — a safe default "stay logged
// in" experience satisfying docs/PROJECT_SPEC.md §26's "remember-me
// behavior if implemented safely" without a separate remember-me toggle.
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_RENEWAL_THRESHOLD_MS = SESSION_DURATION_MS / 2;

export interface CreateSessionMeta {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface CreatedSession {
  cookieValue: string;
  expiresAt: Date;
}

export async function createSession<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  userId: string,
  meta: CreateSessionMeta = {},
): Promise<CreatedSession> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(sessions).values({
    userId,
    sessionTokenHash: hashSessionToken(token),
    userAgent: meta.userAgent ?? null,
    ipAddress: meta.ipAddress ?? null,
    expiresAt,
  });
  return { cookieValue: createSessionCookieValue(token), expiresAt };
}

export interface ValidatedSession {
  sessionId: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Full, authoritative session check: verifies the cookie signature, then
 * looks up the session by token hash and confirms it is unexpired,
 * unrevoked, and belongs to a non-disabled user. This is the "authoritative
 * DB check" half of the two-layer defense described in
 * docs/IMPLEMENTATION_PLAN.md §8 — middleware's cookie-signature check
 * alone is never sufficient for authorization.
 */
export async function validateSessionCookie<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  cookieValue: string | undefined | null,
): Promise<ValidatedSession | null> {
  const token = verifySessionCookieValue(cookieValue);
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const [row] = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      revokedAt: sessions.revokedAt,
      userId: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      disabledAt: users.disabledAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.sessionTokenHash, tokenHash))
    .limit(1);

  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  if (row.disabledAt) return null;

  if (row.expiresAt.getTime() - Date.now() < SESSION_RENEWAL_THRESHOLD_MS) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_DURATION_MS) })
      .where(eq(sessions.id, row.sessionId));
  }

  return {
    sessionId: row.sessionId,
    user: { id: row.userId, email: row.email, name: row.name, role: row.role },
  };
}

export async function revokeSession<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  sessionId: string,
): Promise<void> {
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId));
}

/** Used for "log out all devices" and forced revocation on password reset. */
export async function revokeAllUserSessions<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  userId: string,
): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}
