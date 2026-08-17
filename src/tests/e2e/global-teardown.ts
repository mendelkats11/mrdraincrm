import { cleanupE2eData } from "./cleanup";

export default async function globalTeardown() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Fall through — cleanupE2eData()'s getDb() will surface a clear error
    // if DATABASE_URL is genuinely missing.
  }
  await cleanupE2eData();
}
