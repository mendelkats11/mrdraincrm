import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { generateInvoicePdf } from "@/lib/pdf/invoice-pdf-generator";

// Generated on demand, every request — never stored (Phase 8 §8). The
// invoice row + line items are the immutable snapshot once non-draft, so
// regenerating always produces the same PDF; there's no second source of
// truth to keep in sync or a stale cached file to worry about. Downloading
// this never marks the invoice Sent (Phase 8 decision 6) — that stays an
// explicit action on the invoice detail page.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const idCheck = z.string().uuid().safeParse(id);
  if (!idCheck.success) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  try {
    const db = getDb();
    const result = await generateInvoicePdf(db, idCheck.data);
    if (!result) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${result.invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error(`Invoice PDF generation failed for ${idCheck.data}:`, error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
