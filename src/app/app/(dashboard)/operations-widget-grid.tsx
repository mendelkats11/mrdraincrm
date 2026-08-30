import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import type { OperationsWidgetData } from "@/lib/dashboard/operations-widgets";
import type { listReminders } from "@/lib/reminders/reminders";
import type { OperationsWidgetId } from "@/lib/dashboard/widgets";
import { OPERATIONS_WIDGET_LABELS } from "@/lib/dashboard/widgets";
import { humanizeAction } from "@/components/activity-timeline";
import { BUSINESS_TIMEZONE } from "@/lib/reminders/timezone";
import { ReminderStatusBadge } from "./reminders/reminder-status-badge";

// Server-rendered — see calls/page.tsx's DATE_FMT comment for why timeZone
// must be explicit (server-timezone bug, not a client display issue).
const DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: BUSINESS_TIMEZONE,
});

function WidgetCard({
  id,
  span,
  children,
}: {
  id: OperationsWidgetId;
  span?: "wide";
  children: React.ReactNode;
}) {
  return (
    <Card className={span === "wide" ? "sm:col-span-2 lg:col-span-3" : undefined}>
      <CardHeader>
        <CardTitle className="text-base">{OPERATIONS_WIDGET_LABELS[id]}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">{children}</CardContent>
    </Card>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function OperationsWidgetGrid({
  visibleWidgetIds,
  data,
  overdueReminders,
}: {
  visibleWidgetIds: OperationsWidgetId[];
  data: OperationsWidgetData;
  overdueReminders: Awaited<ReturnType<typeof listReminders>>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibleWidgetIds.map((id) => {
        switch (id) {
          case "todays_jobs":
            return (
              <WidgetCard key={id} id={id} span="wide">
                {data.todaysJobs.length === 0 ? (
                  <EmptyState>Nothing scheduled today.</EmptyState>
                ) : (
                  data.todaysJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-muted/50"
                    >
                      <span className="truncate">
                        {job.jobNumber}
                        {job.issueDescription ? ` — ${job.issueDescription}` : ""}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {job.timeTbd ? "Time TBD" : DATE_FMT.format(job.scheduledStart)}
                      </span>
                    </Link>
                  ))
                )}
              </WidgetCard>
            );
          case "new_leads":
            return (
              <WidgetCard key={id} id={id}>
                <Link href="/leads?status=new" className="text-3xl font-semibold hover:underline">
                  {data.newLeadsCount}
                </Link>
                <EmptyState>Leads awaiting first contact.</EmptyState>
              </WidgetCard>
            );
          case "open_jobs":
            return (
              <WidgetCard key={id} id={id}>
                <Link href="/jobs?status=open" className="text-3xl font-semibold hover:underline">
                  {data.openJobsCount}
                </Link>
                <EmptyState>Jobs ready to be scheduled.</EmptyState>
              </WidgetCard>
            );
          case "emergency_requests":
            return (
              <WidgetCard key={id} id={id}>
                {data.emergencyJobs.length === 0 ? (
                  <EmptyState>No active emergencies.</EmptyState>
                ) : (
                  data.emergencyJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-sm hover:bg-destructive/10"
                    >
                      <AlertTriangle
                        className="size-4 shrink-0 text-destructive"
                        aria-hidden="true"
                      />
                      <span className="truncate">{job.jobNumber}</span>
                    </Link>
                  ))
                )}
              </WidgetCard>
            );
          case "overdue_reminders":
            return (
              <WidgetCard key={id} id={id}>
                {overdueReminders.rows.length === 0 ? (
                  <EmptyState>Nothing overdue.</EmptyState>
                ) : (
                  overdueReminders.rows.map((r) => (
                    <Link
                      key={r.id}
                      href="/reminders"
                      className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-muted/50"
                    >
                      <span className="truncate">{r.title}</span>
                      <ReminderStatusBadge
                        dueAt={r.dueAt}
                        completedAt={r.completedAt}
                        cancelledAt={r.cancelledAt}
                      />
                    </Link>
                  ))
                )}
              </WidgetCard>
            );
          case "outstanding_invoices":
            return (
              <WidgetCard key={id} id={id}>
                <Link
                  href="/invoices?status=sent"
                  className="text-3xl font-semibold hover:underline"
                >
                  {formatCents(data.outstandingInvoices.totalCents)}
                </Link>
                <EmptyState>
                  {data.outstandingInvoices.count} invoice
                  {data.outstandingInvoices.count === 1 ? "" : "s"} awaiting payment.
                </EmptyState>
              </WidgetCard>
            );
          case "contractor_payouts_pending":
            return (
              <WidgetCard key={id} id={id}>
                <Link href="/contractors" className="text-3xl font-semibold hover:underline">
                  {formatCents(data.contractorPayoutsPending.totalCents)}
                </Link>
                <EmptyState>
                  {data.contractorPayoutsPending.count} job
                  {data.contractorPayoutsPending.count === 1 ? "" : "s"} pending payout.
                </EmptyState>
              </WidgetCard>
            );
          case "recent_activity":
            return (
              <WidgetCard key={id} id={id} span="wide">
                {data.recentActivity.length === 0 ? (
                  <EmptyState>No activity yet.</EmptyState>
                ) : (
                  data.recentActivity.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">
                        <span className="font-medium text-foreground">
                          {humanizeAction(entry.action)}
                        </span>
                        <span className="text-muted-foreground">
                          {entry.actorName ? ` — ${entry.actorName}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {DATE_FMT.format(entry.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </WidgetCard>
            );
        }
      })}
    </div>
  );
}
