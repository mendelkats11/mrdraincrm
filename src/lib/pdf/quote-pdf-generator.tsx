import { renderToBuffer } from "@react-pdf/renderer";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { getQuote } from "@/lib/quotes/quotes";
import { appSettings } from "@/lib/db/schema";
import { getStorageProvider } from "@/lib/storage";
import { resolveLogoUrl } from "./logo";
import { toCustomerFacingQuoteDocument } from "./quote-document";
import { QuotePdfDocument } from "./quote-pdf";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

/**
 * Shared by the download route (src/app/app/api/quotes/[id]/pdf/route.tsx)
 * and the "email this quote" action (src/lib/quotes/quote-email.ts) — one
 * place resolving business info, logo, and customer info so both call
 * sites can never drift into producing different PDFs for the same quote.
 */
export async function generateQuotePdf<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  quoteId: string,
) {
  const quote = await getQuote(db, quoteId);
  if (!quote) return null;

  const [settings] = await db.select().from(appSettings).limit(1);

  let logoUrl: string | null = null;
  if (settings?.logoKey) {
    try {
      logoUrl = await resolveLogoUrl(getStorageProvider(), settings.logoKey);
    } catch {
      logoUrl = null;
    }
  }

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
    logoUrl,
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

  return { quote, businessName: settings?.businessName ?? null, customerName, buffer };
}
