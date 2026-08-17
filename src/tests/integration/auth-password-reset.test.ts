// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { requestPasswordReset, resetPassword } from "@/lib/auth/password-reset";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, validateSessionCookie } from "@/lib/auth/session-store";
import { passwordResetTokens, users } from "@/lib/db/schema";
import * as emailModule from "@/lib/email";

async function insertTestUser(db: Awaited<ReturnType<typeof createTestDb>>["db"], email: string) {
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword("old-password-1"), name: "Test User" })
    .returning();
  return user;
}

function captureSentEmails() {
  const sent: { to: string; subject: string; text: string }[] = [];
  vi.spyOn(emailModule, "getEmailProvider").mockReturnValue({
    send: async (input) => {
      sent.push(input);
    },
  });
  return sent;
}

describe("password reset flow", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
    vi.restoreAllMocks();
  });

  it("scenario 8a: full round trip — request, extract token, reset, log in with new password", async () => {
    const user = await insertTestUser(ctx.db, "owner@example.com");
    const sent = captureSentEmails();

    await requestPasswordReset(ctx.db, "owner@example.com", "http://localhost:3000");

    expect(sent).toHaveLength(1);
    const match = /\/reset-password\/([^\s]+)/.exec(sent[0].text);
    expect(match).not.toBeNull();
    const token = match![1];

    const result = await resetPassword(ctx.db, token, "brand-new-password-1");
    expect(result).toEqual({ ok: true });

    const [updated] = await ctx.db.select().from(users).where(eq(users.id, user.id));
    expect(await verifyPassword(updated.passwordHash, "brand-new-password-1")).toBe(true);
    expect(await verifyPassword(updated.passwordHash, "old-password-1")).toBe(false);
  });

  it("does not reveal whether the email exists (no email sent, no error, for unknown email)", async () => {
    const sent = captureSentEmails();
    await expect(
      requestPasswordReset(ctx.db, "nobody@example.com", "http://localhost:3000"),
    ).resolves.toBeUndefined();
    expect(sent).toHaveLength(0);
  });

  it("does not send a reset email for a disabled account", async () => {
    const user = await insertTestUser(ctx.db, "disabled@example.com");
    await ctx.db.update(users).set({ disabledAt: new Date() }).where(eq(users.id, user.id));
    const sent = captureSentEmails();

    await requestPasswordReset(ctx.db, "disabled@example.com", "http://localhost:3000");
    expect(sent).toHaveLength(0);
  });

  it("rejects an invalid token", async () => {
    const result = await resetPassword(ctx.db, "not-a-real-token", "new-password-1");
    expect(result).toEqual({ ok: false, reason: "invalid_or_expired_token" });
  });

  it("rejects an expired token", async () => {
    const user = await insertTestUser(ctx.db, "owner2@example.com");
    const sent = captureSentEmails();
    await requestPasswordReset(ctx.db, "owner2@example.com", "http://localhost:3000");
    const token = /\/reset-password\/([^\s]+)/.exec(sent[0].text)![1];

    await ctx.db
      .update(passwordResetTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(passwordResetTokens.userId, user.id));

    const result = await resetPassword(ctx.db, token, "new-password-1");
    expect(result).toEqual({ ok: false, reason: "invalid_or_expired_token" });
  });

  it("rejects reusing an already-used token", async () => {
    await insertTestUser(ctx.db, "owner3@example.com");
    const sent = captureSentEmails();
    await requestPasswordReset(ctx.db, "owner3@example.com", "http://localhost:3000");
    const token = /\/reset-password\/([^\s]+)/.exec(sent[0].text)![1];

    const first = await resetPassword(ctx.db, token, "new-password-1");
    expect(first).toEqual({ ok: true });

    const second = await resetPassword(ctx.db, token, "another-password-1");
    expect(second).toEqual({ ok: false, reason: "invalid_or_expired_token" });
  });

  it("revokes every existing session when a reset completes", async () => {
    const user = await insertTestUser(ctx.db, "owner4@example.com");
    const session1 = await createSession(ctx.db, user.id);
    const session2 = await createSession(ctx.db, user.id);

    const sent = captureSentEmails();
    await requestPasswordReset(ctx.db, "owner4@example.com", "http://localhost:3000");
    const token = /\/reset-password\/([^\s]+)/.exec(sent[0].text)![1];
    await resetPassword(ctx.db, token, "new-password-1");

    expect(await validateSessionCookie(ctx.db, session1.cookieValue)).toBeNull();
    expect(await validateSessionCookie(ctx.db, session2.cookieValue)).toBeNull();
  });
});
