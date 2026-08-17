import { E2E_OWNER_EMAIL, E2E_OWNER_PASSWORD } from "./e2e-credentials";
import { cleanupE2eData } from "./cleanup";

// Runs once before the E2E suite. Creates a fresh, dedicated test owner
// account directly via the DB (not through the invite flow — this mirrors
// what scripts/create-owner.ts does, since there's no "first user" to
// invite from in a fresh test run either). global-teardown.ts removes
// everything this creates.
export default async function globalSetup() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Fall through — getDb() will throw a clear error if DATABASE_URL is
    // genuinely missing rather than just absent from .env.local.
  }

  // Idempotent: clears out any leftover state from a previous interrupted
  // run before creating fresh.
  await cleanupE2eData();

  const { getDb } = await import("../../lib/db/client");
  const { users } = await import("../../lib/db/schema");
  const { hashPassword } = await import("../../lib/auth/password");

  const db = getDb();
  const passwordHash = await hashPassword(E2E_OWNER_PASSWORD);
  await db.insert(users).values({
    email: E2E_OWNER_EMAIL,
    passwordHash,
    name: "E2E Test Owner",
  });
}
