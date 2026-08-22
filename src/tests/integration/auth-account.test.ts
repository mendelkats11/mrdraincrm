// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { updateDisplayName, updateEmail, changePassword } from "@/lib/auth/account";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, validateSessionCookie } from "@/lib/auth/session-store";
import { users } from "@/lib/db/schema";

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

describe("updateDisplayName", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("updates the name with no password check required", async () => {
    const user = await insertTestUser(ctx.db, "owner@example.com", "correct-horse-battery");
    const result = await updateDisplayName(ctx.db, user.id, "New Name");
    expect(result).toEqual({ ok: true });

    const [updated] = await ctx.db.select().from(users).where(eq(users.id, user.id));
    expect(updated.name).toBe("New Name");
  });
});

describe("updateEmail", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("rejects an incorrect current password and leaves the email unchanged", async () => {
    const user = await insertTestUser(ctx.db, "owner@example.com", "correct-horse-battery");
    const result = await updateEmail(ctx.db, user.id, "wrong-password", "new@example.com");
    expect(result).toEqual({ ok: false, error: "incorrect_password" });

    const [unchanged] = await ctx.db.select().from(users).where(eq(users.id, user.id));
    expect(unchanged.email).toBe("owner@example.com");
  });

  it("rejects an email already used by another account", async () => {
    await insertTestUser(ctx.db, "taken@example.com", "irrelevant");
    const user = await insertTestUser(ctx.db, "owner@example.com", "correct-horse-battery");

    const result = await updateEmail(ctx.db, user.id, "correct-horse-battery", "taken@example.com");
    expect(result).toEqual({ ok: false, error: "email_taken" });
  });

  it("updates the email (normalized to lowercase) with the correct password", async () => {
    const user = await insertTestUser(ctx.db, "owner@example.com", "correct-horse-battery");
    const result = await updateEmail(ctx.db, user.id, "correct-horse-battery", "New@Example.com");
    expect(result).toEqual({ ok: true });

    const [updated] = await ctx.db.select().from(users).where(eq(users.id, user.id));
    expect(updated.email).toBe("new@example.com");
  });
});

describe("changePassword", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("rejects an incorrect current password", async () => {
    const user = await insertTestUser(ctx.db, "owner@example.com", "correct-horse-battery");
    const result = await changePassword(ctx.db, user.id, "wrong-password", "new-password-123");
    expect(result).toEqual({ ok: false, error: "incorrect_password" });
  });

  it("updates the password hash and revokes every existing session", async () => {
    const user = await insertTestUser(ctx.db, "owner@example.com", "correct-horse-battery");
    const { cookieValue } = await createSession(ctx.db, user.id);
    expect(await validateSessionCookie(ctx.db, cookieValue)).not.toBeNull();

    const result = await changePassword(
      ctx.db,
      user.id,
      "correct-horse-battery",
      "new-password-123",
    );
    expect(result).toEqual({ ok: true });

    const [updated] = await ctx.db.select().from(users).where(eq(users.id, user.id));
    expect(await verifyPassword(updated.passwordHash, "new-password-123")).toBe(true);
    expect(await verifyPassword(updated.passwordHash, "correct-horse-battery")).toBe(false);

    expect(await validateSessionCookie(ctx.db, cookieValue)).toBeNull();
  });
});
