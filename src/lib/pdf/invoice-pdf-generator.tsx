import { renderToBuffer } from "@react-pdf/renderer";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { getInvoice } from "@/lib/invoices/invoices";
import { getStorageProvider } from "@/lib/storage";
import { resolveLogoUrl } from "./logo";
import { toCustomerFacingInvoiceDocument } from "./invoice-document";
import { InvoicePdfDocument } from "./invoice-pdf";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

/**
 * Shared by the download route (src/app/app/api/invoices/[id]/pdf/route.tsx)
 * and the "email this invoice" action (src/lib/invoices/invoice-email.ts) —
 * one place that resolves the logo signed URL, builds the customer-facing
 * document, and renders it, so both call sites can never drift into
 * producing different PDFs for the same invoice.
 */
export async function generateInvoicePdf<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  invoiceId: string,
) {
  const invoice = await getInvoice(db, invoiceId);
  if (!invoice) return null;

  let logoUrl: string | null = null;
  if (invoice.logoKey) {
    try {
      logoUrl = await resolveLogoUrl(getStorageProvider(), invoice.logoKey);
    } catch {
      logoUrl = null;
    }
  }

  const document = toCustomerFacingInvoiceDocument({ ...invoice, logoUrl });
  const buffer = await renderToBuffer(<InvoicePdfDocument invoice={document} />);

  return { invoice, buffer };
}
