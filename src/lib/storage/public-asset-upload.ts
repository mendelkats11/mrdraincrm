import { randomUUID } from "node:crypto";
import type { StorageProvider } from "./provider";

const ALLOWED_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_ASSET_BYTES = 10 * 1024 * 1024; // 10MB — same ceiling as job photos.

export type UploadPublicAssetResult = { ok: true; key: string } | { ok: false; error: string };

/**
 * Shared by every Website CMS image upload (service images, service-area
 * images, gallery photos, hero collage photos) — all land under the same "public-assets/"
 * prefix the read-only streaming route (public-asset-handler.ts) is
 * allowlisted to serve. SVG excluded for the same stored-XSS reason as the
 * invoice logo (src/lib/pdf/logo.ts) — these URLs are directly navigable.
 */
export async function uploadPublicAsset(
  storage: StorageProvider,
  input: {
    buffer: Buffer;
    contentType: string;
    category: "services" | "service-areas" | "gallery" | "hero" | "backgrounds" | "media";
  },
): Promise<UploadPublicAssetResult> {
  if (!ALLOWED_CONTENT_TYPES.includes(input.contentType)) {
    return { ok: false, error: "Image must be a PNG, JPEG, or WebP." };
  }
  if (input.buffer.byteLength > MAX_ASSET_BYTES) {
    return { ok: false, error: "Image must be smaller than 10MB." };
  }

  const extension = input.contentType.split("/")[1] || "bin";
  const key = `public-assets/${input.category}/${randomUUID()}.${extension}`;
  await storage.upload({ key, body: input.buffer, contentType: input.contentType });
  return { ok: true, key };
}

/** The stable, cacheable URL path for an uploaded public asset (key as
 *  returned by uploadPublicAsset, including its "public-assets/" prefix) —
 *  resolves correctly from both the public site and the app-host CMS admin
 *  screens (see src/proxy.ts's PUBLIC_ON_APP_HOST_PREFIXES). */
export function publicAssetUrl(key: string): string {
  return `/api/public-assets/${key.replace(/^public-assets\//, "")}`;
}
