import { randomUUID } from "node:crypto";
import type { StorageProvider } from "@/lib/storage";

// SVG is deliberately excluded — it can embed <script>/event handlers, and
// the signed URL this becomes is directly navigable in a browser tab, which
// would execute it in this app's origin (stored XSS). Raster formats only.
const ALLOWED_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB — a logo, not a job photo gallery.

export type UploadLogoResult = { ok: true; key: string } | { ok: false; error: string };

/**
 * Same private-bucket-plus-signed-URL approach as job photos
 * (src/lib/jobs/job-photos.ts) — there's no public R2 bucket configured in
 * this project (R2_BUCKET_PUBLIC is unused anywhere, unset in .env.local),
 * so introducing one just for a logo would be new infrastructure for a
 * problem the existing private bucket already solves: resolve a fresh
 * signed URL immediately before every use (PDF render, settings preview),
 * same pattern already established, instead of storing a URL that expires.
 */
export async function uploadInvoiceLogo(
  storage: StorageProvider,
  input: { buffer: Buffer; contentType: string },
): Promise<UploadLogoResult> {
  if (!ALLOWED_CONTENT_TYPES.includes(input.contentType)) {
    return { ok: false, error: "Logo must be a PNG, JPEG, or WebP image." };
  }
  if (input.buffer.byteLength > MAX_LOGO_BYTES) {
    return { ok: false, error: "Logo must be smaller than 2MB." };
  }

  const extension = input.contentType.split("/")[1] || "bin";
  const key = `settings/logo/${randomUUID()}.${extension}`;
  await storage.upload({ key, body: input.buffer, contentType: input.contentType });
  return { ok: true, key };
}

/**
 * Resolves a stored logo key to a URL usable right now — by a PDF being
 * rendered this instant, or a settings-page <img> tag. Never stored or
 * cached; a fresh call is made every time one is needed.
 */
export async function resolveLogoUrl(
  storage: StorageProvider,
  key: string | null,
): Promise<string | null> {
  if (!key) return null;
  try {
    return await storage.getSignedUrl(key);
  } catch {
    return null;
  }
}
