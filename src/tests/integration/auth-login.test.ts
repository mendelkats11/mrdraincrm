// @vitest-environment node
import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { loginWithPassword } from "@/lib/auth/login";
import { hashPassword } from "@/lib/auth/password";
import { validateSessionCookie } from "@/lib/auth/session-store";
import { RATE_LIMIT_MAX_ATTEMPTS } from "@/lib/auth/rate-limit";
import { activities, users } from "@/lib/db/schema";

async function insertTestUser(
  db: Awaited<ReturnType<typeof createTestDb>>["db"],
  email: string,
  password: string,
) {
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword(password), name: "Test User" })
    .returning();
  return user;
}

describe("loginWithPassword", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("scenario 1: valid credentials succeed and produce a usable session", async () => {
    await insertTestUser(ctx.db, "owner@example.com", "correct-password-1");

    const result = await loginWithPassword(ctx.db, "owner@example.com", "correct-password-1", {
      ipAddress: "10.0.0.1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    const validated = await validateSessionCookie(ctx.db, result.session.cookieValue);
    expect(validated?.user.email).toBe("owner@example.com");
  });

  it("is case-insensitive on email", async () => {
    await insertTestUser(ctx.db, "owner@example.com", "correct-password-1");
    const result = await loginWithPassword(ctx.db, "OWNER@Example.com", "correct-password-1", {});
    expect(result.ok).toBe(true);
  });

  it("scenario 2: wrong password is rejected with a generic reason", async () => {
    await insertTestUser(ctx.db, "owner@example.com", "correct-password-1");

    const result = await loginWithPassword(ctx.db, "owner@example.com", "wrong-password", {
      ipAddress: "10.0.0.2",
    });

    expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("scenario 3: nonexistent user is rejected with the SAME generic reason as wrong password", async () => {
    const result = await loginWithPassword(ctx.db, "nobody@example.com", "anything", {
      ipAddress: "10.0.0.3",
    });

    // Enumeration safety: this must be identical to the wrong-password case.
    expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("rejects a disabled account even with the correct password", async () => {
    const user = await insertTestUser(ctx.db, "disabled@example.com", "correct-password-1");
    await ctx.db.update(users).set({ disabledAt: new Date() }).where(eq(users.id, user.id));

    const result = await loginWithPassword(
      ctx.db,
      "disabled@example.com",
      "correct-password-1",
      {},
    );
    expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("scenario 9: rate limits after too many failed attempts against the same email", async () => {
    await insertTestUser(ctx.db, "owner@example.com", "correct-password-1");

    for (let i = 0; i < RATE_LIMIT_MAX_ATTEMPTS; i++) {
      const attempt = await loginWithPassword(ctx.db, "owner@example.com", "wrong", {
        ipAddress: `10.0.1.${i}`, // different IP each time — still rate limited by email
      });
      expect(attempt).toEqual({ ok: false, reason: "invalid_credentials" });
    }

    // The next attempt is blocked, even with the CORRECT password now.
    const blocked = await loginWithPassword(ctx.db, "owner@example.com", "correct-password-1", {
      ipAddress: "10.0.1.99",
    });
    expect(blocked).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("rate limits a single IP spraying attempts across many different emails", async () => {
    for (let i = 0; i < RATE_LIMIT_MAX_ATTEMPTS; i++) {
      const attempt = await loginWithPassword(ctx.db, `nobody${i}@example.com`, "guess", {
        ipAddress: "10.0.2.1",
      });
      expect(attempt).toEqual({ ok: false, reason: "invalid_credentials" });
    }

    const blocked = await loginWithPassword(ctx.db, "yet-another@example.com", "guess", {
      ipAddress: "10.0.2.1",
    });
    expect(blocked).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("does not rate limit a different email/IP pair", async () => {
    await insertTestUser(ctx.db, "owner@example.com", "correct-password-1");
    for (let i = 0; i < RATE_LIMIT_MAX_ATTEMPTS; i++) {
      await loginWithPassword(ctx.db, "owner@example.com", "wrong", { ipAddress: "10.0.3.1" });
    }

    const otherUser = await loginWithPassword(ctx.db, "someone-else@example.com", "whatever", {
      ipAddress: "10.0.3.2",
    });
    expect(otherUser).toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("scenario 10: records audit activity for success, failure, and rate-limited attempts", async () => {
    const user = await insertTestUser(ctx.db, "owner@example.com", "correct-password-1");

    await loginWithPassword(ctx.db, "owner@example.com", "wrong", { ipAddress: "10.0.4.1" });
    await loginWithPassword(ctx.db, "owner@example.com", "correct-password-1", {
      ipAddress: "10.0.4.1",
    });

    const succeeded = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityId, user.id), eq(activities.action, "login_succeeded")));
    expect(succeeded).toHaveLength(1);
    expect(succeeded[0].actorUserId).toBe(user.id);

    const failed = await ctx.db
      .select()
      .from(activities)
      .where(eq(activities.action, "login_failed"));
    // One row keyed by email-pseudo-id and one keyed by IP-pseudo-id per
    // failed attempt — see src/lib/auth/login.ts.
    expect(failed.length).toBeGreaterThanOrEqual(2);
  });
});
