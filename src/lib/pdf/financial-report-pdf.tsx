import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatCents } from "@/lib/money";
import { formatBasisPointsAsPercent, type JobFinancials } from "@/lib/financials/job-financials";

// Internal-only document (docs/PROJECT_SPEC.md §22: "PDF where appropriate")
// — unlike the customer-facing invoice/quote PDFs, this one deliberately
// does show costs/profit, since it never leaves the business.
const ACCENT = "#0a6ca8";

const styles = StyleSheet.create({
  page: { fontSize: 10, fontFamily: "Helvetica", color: "#1f2937", padding: 40 },
  title: { fontSize: 18, fontWeight: 700, color: ACCENT, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#6b7280", marginBottom: 20 },
  summaryRow: { flexDirection: "row", marginBottom: 24, gap: 12 },
  summaryCard: { flex: 1, borderWidth: 0.5, borderColor: "#e5e7eb", padding: 10 },
  summaryLabel: { fontSize: 8, textTransform: "uppercase", color: "#6b7280", marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: 700 },
  sectionTitle: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: ACCENT,
    fontWeight: 700,
    marginTop: 16,
    marginBottom: 6,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderText: { fontSize: 8, textTransform: "uppercase", fontWeight: 700, color: ACCENT },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  colLabel: { flex: 3 },
  colNum: { flex: 1.5, textAlign: "right" },
  footer: { marginTop: 24, fontSize: 8, color: "#9ca3af" },
});

export interface FinancialReportPdfData {
  dateRangeLabel: string;
  generatedAt: Date;
  totals: JobFinancials;
  jobCount: number;
  byService: { label: string; jobCount: number; financials: JobFinancials }[];
  byMonth: { label: string; jobCount: number; financials: JobFinancials }[];
}

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" });

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; jobCount: number; financials: JobFinancials }[];
}) {
  if (rows.length === 0) return null;
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.colLabel, styles.tableHeaderText]}></Text>
        <Text style={[styles.colNum, styles.tableHeaderText]}>Jobs</Text>
        <Text style={[styles.colNum, styles.tableHeaderText]}>Revenue</Text>
        <Text style={[styles.colNum, styles.tableHeaderText]}>Profit</Text>
      </View>
      {rows.map((row) => (
        <View style={styles.tableRow} key={row.label}>
          <Text style={styles.colLabel}>{row.label}</Text>
          <Text style={styles.colNum}>{row.jobCount}</Text>
          <Text style={styles.colNum}>{formatCents(row.financials.revenueCents)}</Text>
          <Text style={styles.colNum}>{formatCents(row.financials.profitCents)}</Text>
        </View>
      ))}
    </View>
  );
}

export function FinancialReportPdfDocument({ data }: { data: FinancialReportPdfData }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Financial Report</Text>
        <Text style={styles.subtitle}>
          {data.dateRangeLabel} — generated {DATE_FMT.format(data.generatedAt)}
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Revenue</Text>
            <Text style={styles.summaryValue}>{formatCents(data.totals.revenueCents)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Costs</Text>
            <Text style={styles.summaryValue}>{formatCents(data.totals.totalCostsCents)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Profit</Text>
            <Text style={styles.summaryValue}>{formatCents(data.totals.profitCents)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Margin</Text>
            <Text style={styles.summaryValue}>
              {formatBasisPointsAsPercent(data.totals.profitMarginBasisPoints)}
            </Text>
          </View>
        </View>

        <Text>
          Customer Total: {formatCents(data.totals.customerTotalCents)} across {data.jobCount} job
          {data.jobCount === 1 ? "" : "s"}
        </Text>

        <BreakdownTable title="By Service" rows={data.byService} />
        <BreakdownTable title="By Month" rows={data.byMonth} />

        <Text style={styles.footer}>Internal report — not for customer distribution.</Text>
      </Page>
    </Document>
  );
}
