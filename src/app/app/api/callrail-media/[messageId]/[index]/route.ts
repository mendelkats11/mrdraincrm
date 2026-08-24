import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { messages } from "@/lib/db/schema";

/**
 * MMS attachments are private, auth-gated CallRail API resources
 * (https://api.callrail.com/v3/a/{account}/text-messages/{id}/media/{n}) —
 * the browser has no CallRail credential and must never be given one
 * (docs/CLAUDE.md §5), so this route re-fetches the image server-side with
 * CALLRAIL_API_KEY and streams it back same-origin. That also means no CSP
 * img-src change was needed for MMS thumbnails — they're 'self' requests.
 *
 * The URL is looked up from our own already-ingested message row, never
 * taken from the client, and re-validated to actually be a callrail.com
 * URL before fetching — defense in depth against this ever becoming an
 * open proxy, even though the only data source is our own DB.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ messageId: string; index: string }> },
) {
  await requireUser();
  const { messageId, index } = await params;

  const idCheck = z.string().uuid().safeParse(messageId);
  const indexCheck = z.coerce.number().int().min(0).safeParse(index);
  if (!idCheck.success || !indexCheck.success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDb();
  const [message] = await db.select().from(messages).where(eq(messages.id, idCheck.data));
  const mediaUrl = message?.mediaUrls[indexCheck.data];
  if (!mediaUrl || !mediaUrl.startsWith("https://api.callrail.com/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const apiKey = process.env.CALLRAIL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "CallRail is not configured" }, { status: 503 });
  }

  const upstream = await fetch(mediaUrl, {
    headers: { Authorization: `Token token=${apiKey}` },
  });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      // Immutable once ingested — CallRail never changes an existing
      // message's attachment content.
      "Cache-Control": "private, max-age=86400, immutable",
    },
  });
}
