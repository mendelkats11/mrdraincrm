import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { invites, users } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { getEmailProvider } from "@/lib/email";
import { hashPassword } from "./password";
import { normalizeEmail } from "./rate-limit";

const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — docs/IMPLEMENTATION_PLAN.md §8

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface CreateInviteResult {
  inviteId: string;
  token: string;
  expiresAt: Date;
}

/**
 * No public signup route exists anywhere in this app — the only way to
 * create a `users` row (besides the one-time owner bootstrap script) is
 * through this invite → accept-invite path, per docs/CLAUDE.md §5
 * "Registration is invite-only."
 */
export async function createInvite<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  email: string,
  invitedBy: string,
  appUrl: string,
): Promise<CreateInviteResult> {
  const normalizedEmail = normalizeEmail(email);
  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);

  const [invite] = await db
    .insert(invites)
    .values({ email: normalizedEmail, tokenHash: hashToken(token), invitedBy, expiresAt })
    .returning();

  await recordActivity(db, {
    actorUserId: invitedBy,
    entityType: "invite",
    entityId: invite.id,
    action: "invite_created",
    metadata: { email: normalizedEmail },
  });

  const inviteUrl = `${appUrl}/accept-invite/${token}`;
  await getEmailProvider().send({
    to: normalizedEmail,
    subject: "You've been invited to Mr. Drain",
    text: `You've been invited to join Mr. Drain. Accept your invite: ${inviteUrl}\n\nThis link expires in 7 days.`,
  });

  return { inviteId: invite.id, token, expiresAt };
}

export type AcceptInviteResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid_or_expired_token" | "email_already_registered" };

export async function acceptInvite<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  token: string,
  name: string,
  password: string,
): Promise<AcceptInviteResult> {
  const tokenHash = hashToken(token);
  const [invite] = await db.select().from(invites).where(eq(invites.tokenHash, tokenHash)).limit(1);

  if (!invite || invite.acceptedAt || invite.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: "invalid_or_expired_token" };
  }

  const [existing] = await db.select().from(users).where(eq(users.email, invite.email)).limit(1);
  if (existing) {
    return { ok: false, reason: "email_already_registered" };
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ email: invite.email, passwordHash, name })
    .returning();

  await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite.id));

  await recordActivity(db, {
    actorUserId: user.id,
    entityType: "user",
    entityId: user.id,
    action: "user_created_from_invite",
    metadata: { inviteId: invite.id },
  });

  return { ok: true, userId: user.id };
}
