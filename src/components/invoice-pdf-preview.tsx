"use client";

import dynamic from "next/dynamic";
import { PDFViewer } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "@/lib/pdf/invoice-pdf";
import type { CustomerFacingInvoiceDocument } from "@/lib/pdf/invoice-document";

function InvoicePdfPreviewInner({ document }: { document: CustomerFacingInvoiceDocument }) {
  return (
    <PDFViewer key={JSON.stringify(document)} width="100%" height="100%" showToolbar={false}>
      <InvoicePdfDocument invoice={document} />
    </PDFViewer>
  );
}

/**
 * True WYSIWYG, not an approximation — renders the exact same
 * InvoicePdfDocument component the real download route uses
 * (src/app/app/api/invoices/[id]/pdf/route.tsx), just in @react-pdf/
 * renderer's browser-side <PDFViewer> instead of server-side
 * renderToBuffer. One source of truth for what an invoice PDF looks like.
 *
 * PDFViewer throws if it's ever actually rendered outside a real browser —
 * and Next.js still executes "use client" components on the server for the
 * initial SSR pass ("use client" only means "also runs in the browser").
 * `dynamic(..., { ssr: false })` is the supported way to opt a subtree out
 * of that SSR pass entirely, so PDFViewer is never invoked until the
 * browser mounts it.
 */
const InvoicePdfPreviewClientOnly = dynamic(() => Promise.resolve(InvoicePdfPreviewInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Loading preview…
    </div>
  ),
});

export function InvoicePdfPreview({ document }: { document: CustomerFacingInvoiceDocument }) {
  return (
    <div className="sticky top-6 h-[calc(100vh-8rem)] min-h-[500px] overflow-hidden rounded-lg border bg-muted">
      <InvoicePdfPreviewClientOnly document={document} />
    </div>
  );
}
