import { describe, expect, it } from "vitest";
import {
  calculateJobFinancials,
  formatBasisPointsAsPercent,
  sumJobFinancials,
} from "@/lib/financials/job-financials";

describe("calculateJobFinancials", () => {
  it("computes customer total as job amount + tax + custom charges, tax included in revenue by default", () => {
    const result = calculateJobFinancials(
      {
        jobAmountCents: 10000,
        taxAmountCents: 500,
        customChargesCents: 2500,
        materialsCents: 3000,
        contractorPayoutCents: 4000,
      },
      true,
    );
    expect(result.customerTotalCents).toBe(13000);
    expect(result.revenueCents).toBe(13000);
    expect(result.totalCostsCents).toBe(7000);
    expect(result.profitCents).toBe(6000);
    expect(result.profitMarginBasisPoints).toBe(Math.round((6000 * 10000) / 13000));
  });

  it("excludes tax from revenue/profit when includeTaxInRevenue is false, without changing customer total", () => {
    const result = calculateJobFinancials(
      {
        jobAmountCents: 10000,
        taxAmountCents: 500,
        customChargesCents: 0,
        materialsCents: 3000,
        contractorPayoutCents: 4000,
      },
      false,
    );
    expect(result.customerTotalCents).toBe(10500);
    expect(result.revenueCents).toBe(10000);
    expect(result.profitCents).toBe(3000);
  });

  it("supports negative custom charges (discounts)", () => {
    const result = calculateJobFinancials(
      {
        jobAmountCents: 10000,
        taxAmountCents: 0,
        customChargesCents: -1000,
        materialsCents: 0,
        contractorPayoutCents: 0,
      },
      true,
    );
    expect(result.customerTotalCents).toBe(9000);
    expect(result.profitCents).toBe(9000);
  });

  it("returns null margin when revenue is zero rather than dividing by zero", () => {
    const result = calculateJobFinancials(
      {
        jobAmountCents: 0,
        taxAmountCents: 0,
        customChargesCents: 0,
        materialsCents: 0,
        contractorPayoutCents: 0,
      },
      true,
    );
    expect(result.revenueCents).toBe(0);
    expect(result.profitMarginBasisPoints).toBeNull();
  });

  it("allows negative profit when costs exceed revenue", () => {
    const result = calculateJobFinancials(
      {
        jobAmountCents: 1000,
        taxAmountCents: 0,
        customChargesCents: 0,
        materialsCents: 800,
        contractorPayoutCents: 500,
      },
      true,
    );
    expect(result.profitCents).toBe(-300);
    expect(result.profitMarginBasisPoints).toBeLessThan(0);
  });
});

describe("sumJobFinancials", () => {
  it("sums cents fields and recomputes margin from the totals, not an average of per-job margins", () => {
    const a = calculateJobFinancials(
      {
        jobAmountCents: 10000,
        taxAmountCents: 0,
        customChargesCents: 0,
        materialsCents: 0,
        contractorPayoutCents: 5000,
      },
      true,
    ); // profit 5000 / revenue 10000 = 50%
    const b = calculateJobFinancials(
      {
        jobAmountCents: 100000,
        taxAmountCents: 0,
        customChargesCents: 0,
        materialsCents: 0,
        contractorPayoutCents: 90000,
      },
      true,
    ); // profit 10000 / revenue 100000 = 10%

    const total = sumJobFinancials([a, b]);
    expect(total.revenueCents).toBe(110000);
    expect(total.profitCents).toBe(15000);
    // Naive average of 50% and 10% would be 30%; weighted-by-revenue is ~13.6%.
    expect(total.profitMarginBasisPoints).toBe(Math.round((15000 * 10000) / 110000));
    expect(total.profitMarginBasisPoints).not.toBe(3000);
  });

  it("returns zero/null for an empty list", () => {
    const total = sumJobFinancials([]);
    expect(total).toEqual({
      customerTotalCents: 0,
      revenueCents: 0,
      totalCostsCents: 0,
      profitCents: 0,
      profitMarginBasisPoints: null,
    });
  });
});

describe("formatBasisPointsAsPercent", () => {
  it("formats positive, negative, and null values", () => {
    expect(formatBasisPointsAsPercent(4567)).toBe("45.67%");
    expect(formatBasisPointsAsPercent(0)).toBe("0.00%");
    expect(formatBasisPointsAsPercent(-1250)).toBe("-12.50%");
    expect(formatBasisPointsAsPercent(null)).toBe("—");
  });
});
