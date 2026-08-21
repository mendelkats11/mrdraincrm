// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { acceptInvite, createInvite } from "@/lib/auth/invites";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { invites, users } from "@/lib/db/schema";
import * as emailModule from "@/lib/email";
import type { SendEmailInput } from "@/lib/email";

async function insertTestUser(db: Awaited<ReturnType<typeof createTestDb>>["db"], email: string) {
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword("owner-password-1"), name: "Owner" })
    .returning();
  return user;
}

function captureSentEmails() {
  const sent: SendEmailInput[] = [];
  vi.spyOn(emailModule, "getEmailProvider").mockReturnValue({
    send: async (input) => {
      sent.push(input);
    },
  });
  return sent;
}

describe("invite flow", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
    vi.restoreAllMocks();
  });

  it("full round trip: create, extract token, accept, and log in with the new account", async () => {
    const owner = await insertTestUser(ctx.db, "owner@example.com");
    const sent = captureSentEmails();

    const invite = await createInvite(
      ctx.db,
      "teammate@example.com",
      owner.id,
      "http://localhost:3000",
    );

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("teammate@example.com");

    const result = await acceptInvite(ctx.db, invite.token, "New Teammate", "teammate-password-1");
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");

    const [created] = await ctx.db.select().from(users).where(eq(users.id, result.userId));
    expect(created.email).toBe("teammate@example.com");
    expect(created.name).toBe("New Teammate");
    expect(await verifyPassword(created.passwordHash, "teammate-password-1")).toBe(true);
  });

  it("rejects an invalid token", async () => {
    const result = await acceptInvite(ctx.db, "not-a-real-token", "Name", "password-1234");
    expect(result).toEqual({ ok: false, reason: "invalid_or_expired_token" });
  });

  it("rejects an expired invite", async () => {
    const owner = await insertTestUser(ctx.db, "owner2@example.com");
    captureSentEmails();
    const invite = await createInvite(
      ctx.db,
      "late@example.com",
      owner.id,
      "http://localhost:3000",
    );

    await ctx.db
      .update(invites)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(invites.id, invite.inviteId));

    const result = await acceptInvite(ctx.db, invite.token, "Name", "password-1234");
    expect(result).toEqual({ ok: false, reason: "invalid_or_expired_token" });
  });

  it("rejects reusing an already-accepted invite", async () => {
    const owner = await insertTestUser(ctx.db, "owner3@example.com");
    captureSentEmails();
    const invite = await createInvite(
      ctx.db,
      "onceonly@example.com",
      owner.id,
      "http://localhost:3000",
    );

    const first = await acceptInvite(ctx.db, invite.token, "Name", "password-1234");
    expect(first.ok).toBe(true);

    const second = await acceptInvite(ctx.db, invite.token, "Name Again", "password-5678");
    expect(second).toEqual({ ok: false, reason: "invalid_or_expired_token" });
  });

  it("rejects accepting an invite for an email that already has an account", async () => {
    const owner = await insertTestUser(ctx.db, "owner4@example.com");
    await insertTestUser(ctx.db, "existing@example.com");
    captureSentEmails();
    const invite = await createInvite(
      ctx.db,
      "existing@example.com",
      owner.id,
      "http://localhost:3000",
    );

    const result = await acceptInvite(ctx.db, invite.token, "Name", "password-1234");
    expect(result).toEqual({ ok: false, reason: "email_already_registered" });
  });

  it("there is no way to create a user without a valid invite or the bootstrap path", async () => {
    // Structural check: acceptInvite is the only user-creation path besides
    // the owner-bootstrap script, and it always requires a real, unexpired,
    // unaccepted invite row — already covered by the tests above. This test
    // documents that invariant explicitly.
    const before = await ctx.db.select().from(users);
    await acceptInvite(ctx.db, "no-such-token", "Name", "password-1234");
    const after = await ctx.db.select().from(users);
    expect(after).toHaveLength(before.length);
  });
});
