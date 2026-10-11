import { NextResponse } from "next/server";
import { getStorageProvider } from "./index";

// Serves site photos for src/app/api/public-assets/[...key]/route.ts.
//
// The R2 bucket behind getStorageProvider() is private; this is a narrow,
// read-only proxy onto ONLY the "public-assets/" prefix (gallery photos and
// service/service-area images), never an arbitrary-key passthrough. The URL
// path (everything after /api/public-assets/) omits that prefix - it's
// reattached here before hitting storage, so "/api/public-assets/
// gallery/x.jpg" resolves to the R2 object "public-assets/gallery/x.jpg"
// (see publicAssetUrl() in public-asset-upload.ts, the one place that
// constructs these URLs). Anything with an unrecognized extension or
// disallowed characters 404s rather than being streamed. Keys are
// content-addressed (a replaced image gets a new key, nothing is ever
// overwritten in place), so the response is safe to cache aggressively and
// indefinitely.

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const SUFFIX_PATTERN = /^[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp)$/;

export async function servePublicAsset(keyParts: string[]): Promise<NextResponse> {
  const suffix = keyParts.join("/");

  if (!SUFFIX_PATTERN.test(suffix)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const extension = suffix.split(".").pop() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await getStorageProvider().download(`public-assets/${suffix}`);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
