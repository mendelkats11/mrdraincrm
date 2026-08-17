// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import {
  createSession,
  revokeAllUserSessions,
  revokeSession,
  validateSessionCookie,
} from "@/lib/auth/session-store";
import { sessions, users } from "@/lib/db/schema";

async function insertTestUser(db: Awaited<ReturnType<typeof createTestDb>>["db"], email: string) {
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: "irrelevant-for-session-tests", name: "Test User" })
    .returning();
  return user;
}

describe("session store", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a session and validates it back to the same user", async () => {
    const user = await insertTestUser(ctx.db, "owner@example.com");
    const created = await createSession(ctx.db, user.id, {
      userAgent: "vitest",
      ipAddress: "127.0.0.1",
    });

    expect(created.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const validated = await validateSessionCookie(ctx.db, created.cookieValue);
    expect(validated).not.toBeNull();
    expect(validated?.user.id).toBe(user.id);
    expect(validated?.user.email).toBe("owner@example.com");
  });

  it("rejects a missing or garbage cookie", async () => {
    expect(await validateSessionCookie(ctx.db, undefined)).toBeNull();
    expect(await validateSessionCookie(ctx.db, "garbage")).toBeNull();
  });

  it("rejects a well-signed cookie for a session that was never created", async () => {
    const user = await insertTestUser(ctx.db, "owner2@example.com");
    const real = await createSession(ctx.db, user.id);
    // A validly-signed cookie for a *different* random token never persisted.
    const { createSessionCookieValue, generateSessionToken } =
      await import("@/lib/auth/session-token");
    const foreignCookie = createSessionCookieValue(generateSessionToken());
    expect(foreignCookie).not.toBe(real.cookieValue);
    expect(await validateSessionCookie(ctx.db, foreignCookie)).toBeNull();
  });

  it("rejects a revoked session", async () => {
    const user = await insertTestUser(ctx.db, "owner3@example.com");
    const created = await createSession(ctx.db, user.id);
    const validated = await validateSessionCookie(ctx.db, created.cookieValue);
    await revokeSession(ctx.db, validated!.sessionId);

    expect(await validateSessionCookie(ctx.db, created.cookieValue)).toBeNull();
  });

  it("rejects an expired session", async () => {
    const user = await insertTestUser(ctx.db, "owner4@example.com");
    const created = await createSession(ctx.db, user.id);
    const validated = await validateSessionCookie(ctx.db, created.cookieValue);

    await ctx.db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.id, validated!.sessionId));

    expect(await validateSessionCookie(ctx.db, created.cookieValue)).toBeNull();
  });

  it("rejects a session belonging to a disabled user", async () => {
    const user = await insertTestUser(ctx.db, "owner5@example.com");
    const created = await createSession(ctx.db, user.id);

    await ctx.db.update(users).set({ disabledAt: new Date() }).where(eq(users.id, user.id));

    expect(await validateSessionCookie(ctx.db, created.cookieValue)).toBeNull();
  });

  it("revokeAllUserSessions revokes every session for that user and no one else's", async () => {
    const userA = await insertTestUser(ctx.db, "a@example.com");
    const userB = await insertTestUser(ctx.db, "b@example.com");

    const a1 = await createSession(ctx.db, userA.id);
    const a2 = await createSession(ctx.db, userA.id);
    const b1 = await createSession(ctx.db, userB.id);

    await revokeAllUserSessions(ctx.db, userA.id);

    expect(await validateSessionCookie(ctx.db, a1.cookieValue)).toBeNull();
    expect(await validateSessionCookie(ctx.db, a2.cookieValue)).toBeNull();
    expect(await validateSessionCookie(ctx.db, b1.cookieValue)).not.toBeNull();
  });

  it("slides expiry forward when a session is validated past its renewal threshold", async () => {
    const user = await insertTestUser(ctx.db, "owner6@example.com");
    const created = await createSession(ctx.db, user.id);
    const validated = await validateSessionCookie(ctx.db, created.cookieValue);

    // Simulate the session being most of the way through its lifetime.
    const nearExpiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour left
    await ctx.db
      .update(sessions)
      .set({ expiresAt: nearExpiry })
      .where(eq(sessions.id, validated!.sessionId));

    await validateSessionCookie(ctx.db, created.cookieValue);

    const [row] = await ctx.db
      .select({ expiresAt: sessions.expiresAt })
      .from(sessions)
      .where(eq(sessions.id, validated!.sessionId));
    expect(row.expiresAt.getTime()).toBeGreaterThan(nearExpiry.getTime());
  });
});
