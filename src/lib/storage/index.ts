import { R2StorageProvider } from "./r2-provider";
import type { StorageProvider } from "./provider";

export type { StorageProvider, UploadInput } from "./provider";

let provider: StorageProvider | undefined;

/**
 * Lazy singleton, mirroring src/lib/db/client.ts's getDb() — importing this
 * module must not throw just because R2 credentials aren't set yet (e.g.
 * during a build, or in tests that use a fake StorageProvider instead); the
 * error only surfaces when a caller actually tries to use it.
 */
export function getStorageProvider(): StorageProvider {
  if (!provider) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_PRIVATE;
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        "R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
          "R2_SECRET_ACCESS_KEY, and R2_BUCKET_PRIVATE in .env.local (see .env.example).",
      );
    }
    provider = new R2StorageProvider({ accountId, accessKeyId, secretAccessKey, bucket });
  }
  return provider;
}
