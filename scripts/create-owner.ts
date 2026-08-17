// One-time bootstrap for the very first user. Not a public/web route —
// invites.invited_by is NOT NULL, so the first-ever user can't be created
// through the normal invite flow (there is no existing user to invite
// from yet). This is an operator action, analogous to `django-admin
// createsuperuser`, run once against a real database.
//
// Usage:
//   npm run auth:create-owner -- --email=you@example.com --password=... --name="Your Name"

import { eq } from "drizzle-orm";

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
  const { email, password, name } = args;

  if (!email || !password || !name) {
    console.error(
      'Usage: npm run auth:create-owner -- --email=you@example.com --password=... --name="Your Name"',
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const { getDb } = await import("../src/lib/db/client");
  const { users } = await import("../src/lib/db/schema");
  const { hashPassword } = await import("../src/lib/auth/password");
  const db = getDb();

  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) {
    console.error(
      "Refusing to run: this database already has at least one user. " +
        "Use the invite flow (npm run auth:create-invite) to add more.",
    );
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const [existingByEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);
  if (existingByEmail) {
    console.error(`A user with email ${normalizedEmail} already exists.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ email: normalizedEmail, passwordHash, name })
    .returning({ id: users.id, email: users.email });

  console.log(`Owner account created: ${user.email} (${user.id})`);
}

main().catch((error: unknown) => {
  console.error("Failed to create owner:", error);
  process.exit(1);
});
