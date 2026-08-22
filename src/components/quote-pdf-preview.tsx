"use client";

import dynamic from "next/dynamic";
import { PDFViewer } from "@react-pdf/renderer";
import { QuotePdfDocument } from "@/lib/pdf/quote-pdf";
import type { CustomerFacingQuoteDocument } from "@/lib/pdf/quote-document";

function QuotePdfPreviewInner({ document }: { document: CustomerFacingQuoteDocument }) {
  return (
    <PDFViewer key={JSON.stringify(document)} width="100%" height="100%" showToolbar={false}>
      <QuotePdfDocument quote={document} />
    </PDFViewer>
  );
}

/** Mirrors InvoicePdfPreview (src/components/invoice-pdf-preview.tsx) —
 *  same true-WYSIWYG, client-only-render rationale, just for quotes. */
const QuotePdfPreviewClientOnly = dynamic(() => Promise.resolve(QuotePdfPreviewInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Loading preview…
    </div>
  ),
});

export function QuotePdfPreview({ document }: { document: CustomerFacingQuoteDocument }) {
  return (
    <div className="sticky top-6 h-[calc(100vh-8rem)] min-h-[500px] overflow-hidden rounded-lg border bg-muted">
      <QuotePdfPreviewClientOnly document={document} />
    </div>
  );
}
