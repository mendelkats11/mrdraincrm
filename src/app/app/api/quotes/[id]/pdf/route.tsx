import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getQuote } from "@/lib/quotes/quotes";
import { appSettings } from "@/lib/db/schema";
import { toCustomerFacingQuoteDocument } from "@/lib/pdf/quote-document";
import { QuotePdfDocument } from "@/lib/pdf/quote-pdf";

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
  const db = getDb();

  const quote = await getQuote(db, id);
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const [settings] = await db.select().from(appSettings).limit(1);

  const customerName = quote.organizationName ?? quote.contactName ?? null;
  const customerAddress = quote.propertyAddressLine1
    ? [quote.propertyAddressLine1, quote.propertyCity].filter(Boolean).join(", ")
    : null;

  const document = toCustomerFacingQuoteDocument({
    quoteNumber: quote.quoteNumber,
    createdAt: quote.createdAt,
    expiresAt: quote.expiresAt,
    businessName: settings?.businessName ?? null,
    businessAddress: settings?.businessAddress ?? null,
    logoUrl: settings?.logoUrl ?? null,
    customerName,
    customerAddress,
    description: quote.description,
    lineItems: quote.lineItems,
    customCharges: quote.customCharges,
    subtotalCents: quote.subtotalCents,
    taxCents: quote.taxCents,
    notes: quote.notes,
  });
  const buffer = await renderToBuffer(<QuotePdfDocument quote={document} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.quoteNumber}.pdf"`,
    },
  });
}
