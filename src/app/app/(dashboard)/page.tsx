import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { getDb } from "@/lib/db/client";
import { listReminders } from "@/lib/reminders/reminders";
import { getOperationsWidgetData } from "@/lib/dashboard/operations-widgets";
import { getFinancialReport } from "@/lib/reports/financial-report";
import { getFinancialWidgetExtras } from "@/lib/dashboard/financial-widgets";
import {
  resolveReportDateRange,
  type ReportSearchParams,
} from "@/lib/reports/resolve-range-from-search-params";
import { getUserPreferences } from "@/lib/preferences/user-preferences";
import { applyOrderAndVisibility } from "@/lib/preferences/apply-order";
import {
  ALWAYS_VISIBLE_OPERATIONS_WIDGETS,
  OPERATIONS_WIDGET_IDS,
  type OperationsWidgetId,
} from "@/lib/dashboard/widgets";
import type { DashboardMode } from "@/lib/preferences/user-preferences";
import { formatCents } from "@/lib/money";
import { formatBasisPointsAsPercent } from "@/lib/financials/job-financials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardModeToggle } from "./dashboard-mode-toggle";
import { WidgetCustomizer } from "./widget-customizer";
import { OperationsWidgetGrid } from "./operations-widget-grid";
import { DateRangeFilter } from "./reports/date-range-filter";

const DEFAULT_OPERATIONS_ORDER: string[] = [...OPERATIONS_WIDGET_IDS];
const ALWAYS_VISIBLE = new Set<string>(ALWAYS_VISIBLE_OPERATIONS_WIDGETS);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<ReportSearchParams & { mode?: string }>;
}) {
  const session = await requireUser();
  const db = getDb();
  const params = await searchParams;
  const prefs = await getUserPreferences(db, session.user.id);
  const mode: DashboardMode =
    params.mode === "financial" || params.mode === "operations" ? params.mode : prefs.dashboardMode;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Welcome, {session.user.name}</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "operations"
              ? "Today's operations at a glance."
              : "Financial performance for the selected date range."}
          </p>
        </div>
        <DashboardModeToggle mode={mode} />
      </div>

      {mode === "operations" ? (
        <OperationsTab
          hiddenIds={prefs.dashboardWidgetHidden}
          orderIds={prefs.dashboardWidgetOrder}
        />
      ) : (
        <FinancialTab searchParams={params} />
      )}
    </div>
  );
}

async function OperationsTab({ orderIds, hiddenIds }: { orderIds: string[]; hiddenIds: string[] }) {
  const db = getDb();
  const now = new Date();
  const [data, overdueReminders] = await Promise.all([
    getOperationsWidgetData(db, now),
    listReminders(db, { status: "overdue", pageSize: 10 }, now),
  ]);

  // Defensive: an always-visible widget can never actually be hidden, even
  // if a stale/tampered preference row says otherwise.
  const effectiveHidden = hiddenIds.filter((id) => !ALWAYS_VISIBLE.has(id));
  const visibleWidgetIds = applyOrderAndVisibility(
    DEFAULT_OPERATIONS_ORDER,
    orderIds,
    effectiveHidden,
  ) as OperationsWidgetId[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <WidgetCustomizer savedOrder={orderIds} savedHidden={hiddenIds} />
      </div>
      <OperationsWidgetGrid
        visibleWidgetIds={visibleWidgetIds}
        data={data}
        overdueReminders={overdueReminders}
      />
    </div>
  );
}

async function FinancialTab({ searchParams }: { searchParams: ReportSearchParams }) {
  const db = getDb();
  const dateRange = resolveReportDateRange(searchParams);
  const [report, extras] = await Promise.all([
    getFinancialReport(db, { dateRange }),
    getFinancialWidgetExtras(db, dateRange),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <DateRangeFilter basePath="/" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Revenue" value={formatCents(report.totals.revenueCents)} />
        <SummaryCard label="Profit" value={formatCents(report.totals.profitCents)} />
        <SummaryCard
          label="Profit Margin"
          value={formatBasisPointsAsPercent(report.totals.profitMarginBasisPoints)}
        />
        <SummaryCard label="Materials" value={formatCents(extras.materialsCents)} />
        <SummaryCard label="Contractor Payouts" value={formatCents(extras.contractorPayoutCents)} />
        <SummaryCard label="Outstanding" value={formatCents(extras.outstandingCents)} />
      </div>

      {report.byMonth.length > 0 ? (
        <TrendTable title="Revenue / Profit Trend" rows={report.byMonth} />
      ) : null}
      {report.byService.length > 0 ? (
        <TrendTable title="By Service" rows={report.byService} />
      ) : null}

      <Link href="/reports/financial" className="text-sm text-primary hover:underline">
        View the full Financial report →
      </Link>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}

function TrendTable({
  title,
  rows,
}: {
  title: string;
  rows: {
    label: string;
    jobCount: number;
    financials: { revenueCents: number; profitCents: number };
  }[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              colSpan={4}
              className="text-xs font-semibold uppercase text-muted-foreground"
            >
              {title}
            </TableHead>
          </TableRow>
          <TableRow>
            <TableHead></TableHead>
            <TableHead className="text-right">Jobs</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Profit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell>{row.label}</TableCell>
              <TableCell className="text-right">{row.jobCount}</TableCell>
              <TableCell className="text-right">
                {formatCents(row.financials.revenueCents)}
              </TableCell>
              <TableCell className="text-right">
                {formatCents(row.financials.profitCents)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
