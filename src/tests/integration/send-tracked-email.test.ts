// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import { sendTrackedEmail } from "@/lib/email/send-tracked-email";
import { emailEvents } from "@/lib/db/schema";
import * as emailModule from "@/lib/email";

describe("sendTrackedEmail", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
    vi.restoreAllMocks();
  });

  it("records a 'sent' email_events row on success", async () => {
    vi.spyOn(emailModule, "getEmailProvider").mockReturnValue({
      send: async () => {},
    });

    const result = await sendTrackedEmail(ctx.db, {
      to: "customer@example.com",
      subject: "Test",
      text: "Body",
      template: "invoice",
      relatedEntityType: "invoice",
      relatedEntityId: "00000000-0000-0000-0000-000000000001",
    });

    expect(result).toEqual({ ok: true });
    const rows = await ctx.db.select().from(emailEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      toEmail: "customer@example.com",
      template: "invoice",
      relatedEntityType: "invoice",
      status: "sent",
    });
  });

  it("records a 'failed' email_events row when the provider throws, and still returns cleanly", async () => {
    vi.spyOn(emailModule, "getEmailProvider").mockReturnValue({
      send: async () => {
        throw new Error("simulated Resend outage");
      },
    });

    const result = await sendTrackedEmail(ctx.db, {
      to: "customer@example.com",
      subject: "Test",
      text: "Body",
      template: "quote",
    });

    expect(result.ok).toBe(false);
    const rows = await ctx.db.select().from(emailEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("failed");
  });

  it("joins multiple recipients into one toEmail string", async () => {
    vi.spyOn(emailModule, "getEmailProvider").mockReturnValue({
      send: async () => {},
    });

    await sendTrackedEmail(ctx.db, {
      to: ["a@example.com", "b@example.com"],
      subject: "Test",
      text: "Body",
      template: "lead_notification",
    });

    const [row] = await ctx.db.select().from(emailEvents);
    expect(row.toEmail).toBe("a@example.com, b@example.com");
  });

  it("never stores the subject or body — only to/template/status/entity", async () => {
    vi.spyOn(emailModule, "getEmailProvider").mockReturnValue({
      send: async () => {},
    });

    await sendTrackedEmail(ctx.db, {
      to: "customer@example.com",
      subject: "Secret subject",
      text: "Secret body content",
      template: "invoice",
    });

    const [row] = await ctx.db
      .select()
      .from(emailEvents)
      .where(eq(emailEvents.template, "invoice"));
    expect(Object.values(row)).not.toContain("Secret subject");
    expect(Object.values(row)).not.toContain("Secret body content");
  });
});
