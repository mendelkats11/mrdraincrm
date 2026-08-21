import { servePublicAsset } from "@/lib/storage/public-asset-handler";

// Reached on the app host (app.mrdrainsk.com) — the CMS admin screens
// preview the same public-facing images they manage. Allowlisted in
// src/proxy.ts's PUBLIC_ON_APP_HOST_PREFIXES: these are public marketing
// assets, not private data, so no session is required here either. See
// src/lib/storage/public-asset-handler.ts for the shared implementation.
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  return servePublicAsset(key);
}
