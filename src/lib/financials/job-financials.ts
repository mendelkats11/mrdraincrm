// The financial engine — docs/PROJECT_SPEC.md §11.1. Pure, deterministic
// functions only (no I/O), reading raw manually-entered cents fields and
// producing derived totals. Every existing raw field (job amount, tax,
// custom charges, materials, payout) remains stored exactly as entered —
// this module only ever reads them, never writes them, satisfying §29
// ("preserve raw financial inputs separately from derived totals").
//
// Integer-cents arithmetic throughout (docs/CLAUDE.md §8) — no
// floating-point. Profit margin is returned as integer basis points
// (1/100 of a percent, e.g. 4567 = 45.67%) rather than a float, so the
// result is exact and reproducible; callers divide by 100 only for display.

export interface JobFinancialInputs {
  jobAmountCents: number;
  taxAmountCents: number;
  customChargesCents: number;
  materialsCents: number;
  contractorPayoutCents: number;
}

export interface JobFinancials {
  /** Job Amount + Tax + Custom Charges — what the customer owes, per
   *  §11.1's base formula. Always includes tax, regardless of the
   *  revenue/profit tax-inclusion setting below. */
  customerTotalCents: number;
  /** Customer Total, minus Tax when `includeTaxInRevenue` is false. This is
   *  the figure revenue/profit reports and the financial dashboard use —
   *  §11.1: "Tax inclusion in revenue/profit is configurable in Settings." */
  revenueCents: number;
  /** Materials + Plumber Payout. */
  totalCostsCents: number;
  /** Revenue - Total Costs. */
  profitCents: number;
  /** Profit / Revenue, in basis points (1/100 of a percent). Null when
   *  revenue is zero — "where meaningful," per §11.1. */
  profitMarginBasisPoints: number | null;
}

/**
 * @param includeTaxInRevenue appSettings.includeTaxInRevenue, read by the
 *   caller at query time — never baked into stored data, so flipping the
 *   setting changes every future report without rewriting a single job row.
 */
export function calculateJobFinancials(
  inputs: JobFinancialInputs,
  includeTaxInRevenue: boolean,
): JobFinancials {
  const customerTotalCents =
    inputs.jobAmountCents + inputs.taxAmountCents + inputs.customChargesCents;
  const revenueCents = includeTaxInRevenue
    ? customerTotalCents
    : customerTotalCents - inputs.taxAmountCents;
  const totalCostsCents = inputs.materialsCents + inputs.contractorPayoutCents;
  const profitCents = revenueCents - totalCostsCents;
  const profitMarginBasisPoints =
    revenueCents === 0 ? null : Math.round((profitCents * 10000) / revenueCents);

  return {
    customerTotalCents,
    revenueCents,
    totalCostsCents,
    profitCents,
    profitMarginBasisPoints,
  };
}

/** Sums a list of job financials into one aggregate — used for report
 *  summary cards. Margin is recomputed from the summed cents, not averaged
 *  from per-job margins (averaging percentages would misweight small and
 *  large jobs equally). */
export function sumJobFinancials(rows: JobFinancials[]): JobFinancials {
  let customerTotalCents = 0;
  let revenueCents = 0;
  let totalCostsCents = 0;
  let profitCents = 0;
  for (const row of rows) {
    customerTotalCents += row.customerTotalCents;
    revenueCents += row.revenueCents;
    totalCostsCents += row.totalCostsCents;
    profitCents += row.profitCents;
  }
  const profitMarginBasisPoints =
    revenueCents === 0 ? null : Math.round((profitCents * 10000) / revenueCents);
  return {
    customerTotalCents,
    revenueCents,
    totalCostsCents,
    profitCents,
    profitMarginBasisPoints,
  };
}

/** Formats basis points as a display string, e.g. 4567 -> "45.67%". Null -> "—". */
export function formatBasisPointsAsPercent(basisPoints: number | null): string {
  if (basisPoints === null) return "—";
  const sign = basisPoints < 0 ? "-" : "";
  const abs = Math.abs(basisPoints);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${fraction}%`;
}
