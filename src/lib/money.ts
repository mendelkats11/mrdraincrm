// Exact decimal-string <-> integer-cents conversion — deliberately avoids
// parseFloat()*100, which can misround (e.g. 150.1 * 100 !== 15010 in IEEE
// 754). docs/CLAUDE.md §8: "Do not use floating-point arithmetic for stored
// monetary values."

/** Parses a dollar-amount string (e.g. "150.5", "-12.34") into integer cents. */
export function dollarsToCents(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;

  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [dollarsPart, centsPart = ""] = unsigned.split(".");

  const dollars = parseInt(dollarsPart || "0", 10) || 0;
  const cents = parseInt((centsPart + "00").slice(0, 2), 10) || 0;

  const total = dollars * 100 + cents;
  return negative ? -total : total;
}

/** Formats integer cents as a plain dollar-amount string for a form input's defaultValue, e.g. -1234 -> "-12.34". */
export function centsToDollarsInputValue(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${dollars}.${remainder}`;
}

/** Formats integer cents for display, e.g. -1234 -> "-$12.34". */
export function formatCents(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}$${dollars.toLocaleString("en-CA")}.${remainder}`;
}

/**
 * Invoice line-item total = quantity × unit price, in cents, without ever
 * using parseFloat()/floating-point multiplication (docs/CLAUDE.md §8).
 * `quantity` is a decimal string matching the invoice_line_items.quantity
 * column (numeric(10,2), e.g. "2", "1.5", "-1" for a discount line) — it's
 * converted to an exact integer count of hundredths the same way
 * dollarsToCents converts a dollar string to cents, then multiplied against
 * unitPriceCents as plain integers before a single final division by 100.
 */
export function calculateLineTotalCents(quantity: string, unitPriceCents: number): number {
  const trimmed = quantity.trim();
  if (!trimmed) return 0;

  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholePart, fractionalPart = ""] = unsigned.split(".");

  const whole = parseInt(wholePart || "0", 10) || 0;
  const fractional = parseInt((fractionalPart + "00").slice(0, 2), 10) || 0;
  const quantityHundredths = whole * 100 + fractional;
  const signedQuantityHundredths = negative ? -quantityHundredths : quantityHundredths;

  return Math.round((signedQuantityHundredths * unitPriceCents) / 100);
}
