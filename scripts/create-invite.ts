// Generates an invite and prints the accept-invite URL to the console
// (Resend production sending isn't wired up yet — see
// src/lib/email/console-provider.ts). A proper "invite teammate" UI page
// belongs with Settings/user-management (a later phase); this script
// covers the same underlying capability for now.
//
// Usage:
//   npm run auth:create-invite -- --email=teammate@example.com --invited-by-email=you@example.com

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fall through to getDb()'s own error.
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { email, ["invited-by-email"]: invitedByEmail } = args;

  if (!email || !invitedByEmail) {
    console.error(
      "Usage: npm run auth:create-invite -- --email=teammate@example.com --invited-by-email=you@example.com",
    );
    process.exit(1);
  }

  const { eq } = await import("drizzle-orm");
  const { getDb } = await import("../src/lib/db/client");
  const { users } = await import("../src/lib/db/schema");
  const { createInvite } = await import("../src/lib/auth/invites");
  const db = getDb();

  const [inviter] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, invitedByEmail.trim().toLowerCase()))
    .limit(1);
  if (!inviter) {
    console.error(`No user found with email ${invitedByEmail}.`);
    process.exit(1);
  }

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const result = await createInvite(db, email, inviter.id, appUrl);
  console.log(`Invite created, expires ${result.expiresAt.toISOString()}.`);
  console.log(`Accept URL: ${appUrl}/accept-invite/${result.token}`);
}

main().catch((error: unknown) => {
  console.error("Failed to create invite:", error);
  process.exit(1);
});
