import { formatCents } from "@/lib/money";

/** Shared Subtotal/Tax/Total summary for the Invoice and Quote detail
 *  pages — previously identical markup duplicated in both, and the total
 *  carried no more visual weight than its own subtotal (overhaul.md §19:
 *  "the total should have obvious hierarchy... make it feel satisfying to
 *  complete an invoice"). Text stays exactly "Subtotal: $X.XX" / "Tax:
 *  $X.XX" / "Total: $X.XX" as single text nodes — src/tests/e2e/
 *  invoices.spec.ts and quotes.spec.ts assert on that exact combined
 *  string via getByText, so only the surrounding presentation changes. */
export function DocumentTotals({
  subtotalCents,
  taxCents,
  totalCents,
}: {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}) {
  return (
    <div className="flex flex-col items-end gap-1 border-t pt-3 text-sm">
      <p className="text-muted-foreground">Subtotal: {formatCents(subtotalCents)}</p>
      <p className="text-muted-foreground">Tax: {formatCents(taxCents)}</p>
      <p className="mt-1 rounded-lg bg-primary/8 px-3 py-2 text-lg font-semibold text-primary">
        Total: {formatCents(totalCents)}
      </p>
    </div>
  );
}
