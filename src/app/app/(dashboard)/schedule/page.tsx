import { getDb } from "@/lib/db/client";
import { listScheduledJobs } from "@/lib/jobs/jobs";
import { getCurrentAssignmentsForJobs } from "@/lib/contractors/assignments";
import { parseDateParam } from "@/lib/schedule/ranges";
import { ScheduleNav } from "./schedule-nav";
import { parseView, getViewRange } from "./view-range";
import { DayView } from "./day-view";
import { WeekView } from "./week-view";
import { MonthView } from "./month-view";
import { ListView } from "./list-view";
import type { ScheduledJobWithContractor } from "./schedule-job-row";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const view = parseView(params.view);
  const date = parseDateParam(params.date);
  const { start, end, heading } = getViewRange(view, date);

  const db = getDb();
  const jobs = await listScheduledJobs(db, { start, end });

  const assignments = await getCurrentAssignmentsForJobs(
    db,
    jobs.map((j) => j.id),
  );
  const jobsWithContractor: ScheduledJobWithContractor[] = jobs.map((job) => ({
    ...job,
    contractorName: assignments.get(job.id)?.contractorName ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Schedule</h1>
      </div>

      <ScheduleNav view={view} date={date} />

      <h2 className="text-sm font-medium text-muted-foreground">{heading}</h2>

      {view === "day" ? <DayView jobs={jobsWithContractor} /> : null}
      {view === "week" ? (
        <WeekView weekStart={start} weekEnd={end} jobs={jobsWithContractor} />
      ) : null}
      {view === "month" ? (
        <MonthView gridStart={start} gridEnd={end} monthDate={date} jobs={jobsWithContractor} />
      ) : null}
      {view === "list" ? <ListView jobs={jobsWithContractor} /> : null}
    </div>
  );
}
