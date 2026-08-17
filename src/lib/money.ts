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
