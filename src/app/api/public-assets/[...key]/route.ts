import { servePublicAsset } from "@/lib/storage/public-asset-handler";

// Reached directly on the public host (mrdrainsk.com) — see
// src/lib/storage/public-asset-handler.ts for the shared implementation
// and full reasoning.
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  return servePublicAsset(key);
}
