import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getInvoice } from "@/lib/invoices/invoices";
import { toCustomerFacingInvoiceDocument } from "@/lib/pdf/invoice-document";
import { InvoicePdfDocument } from "@/lib/pdf/invoice-pdf";

// Generated on demand, every request — never stored (Phase 8 §8). The
// invoice row + line items are the immutable snapshot once non-draft, so
// regenerating always produces the same PDF; there's no second source of
// truth to keep in sync or a stale cached file to worry about. Downloading
// this never marks the invoice Sent (Phase 8 decision 6) — that stays an
// explicit action on the invoice detail page.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const db = getDb();

  const invoice = await getInvoice(db, id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const document = toCustomerFacingInvoiceDocument(invoice);
  const buffer = await renderToBuffer(<InvoicePdfDocument invoice={document} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
