import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { generateQuotePdf } from "@/lib/pdf/quote-pdf-generator";

// Placed under src/app/app/api (not src/app/api) from the start — Phase 8
// found that the app-host proxy rewrites every request to /app/<path>, so a
// route outside that tree 404s in production. See netlify.toml/proxy.ts.
//
// Generated on demand, every request — never stored. Quotes have no
// snapshotted business/customer text (unlike invoices), so those are
// resolved live here: business info from the current appSettings row,
// customer info from the quote's joined contact/organization/property.
// Downloading this never marks the quote Sent (Phase 9 decision, mirrors
// Phase 8 decision 6 for invoices).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const idCheck = z.string().uuid().safeParse(id);
  if (!idCheck.success) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  try {
    const db = getDb();
    const result = await generateQuotePdf(db, idCheck.data);
    if (!result) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${result.quote.quoteNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error(`Quote PDF generation failed for ${idCheck.data}:`, error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
