import Link from "next/link";
import { eachDayInRange, isSameDay } from "@/lib/schedule/ranges";
import { formatTimeRange } from "@/lib/schedule/format";
import { ScheduleJobRow, type ScheduledJobWithContractor } from "./schedule-job-row";

const DAY_HEADER_FMT = new Intl.DateTimeFormat("en-CA", { weekday: "short", day: "numeric" });

export function WeekView({
  weekStart,
  weekEnd,
  jobs,
}: {
  weekStart: Date;
  weekEnd: Date;
  jobs: ScheduledJobWithContractor[];
}) {
  const days = eachDayInRange(weekStart, weekEnd);
  const jobsByDay = days.map((day) => ({
    day,
    jobs: jobs.filter((j) => isSameDay(j.scheduledStart, day)),
  }));

  return (
    <>
      {/* Desktop: 7-column grid. */}
      <div className="hidden gap-3 sm:grid sm:grid-cols-7">
        {jobsByDay.map(({ day, jobs: dayJobs }) => (
          <div key={day.toISOString()} className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              {DAY_HEADER_FMT.format(day)}
            </p>
            <div className="flex flex-col gap-1">
              {dayJobs.length === 0 ? (
                <p className="text-xs text-muted-foreground">—</p>
              ) : (
                dayJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex flex-col gap-0.5 rounded-md border p-1.5 text-xs transition-colors hover:border-primary"
                  >
                    <span className="font-medium text-foreground">{formatTimeRange(job)}</span>
                    <span className="text-muted-foreground">{job.jobNumber}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: vertically stacked day-by-day, not squeezed columns. */}
      <div className="flex flex-col gap-6 sm:hidden">
        {jobsByDay.map(({ day, jobs: dayJobs }) => (
          <div key={day.toISOString()} className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">{DAY_HEADER_FMT.format(day)}</p>
            {dayJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {dayJobs.map((job) => (
                  <ScheduleJobRow key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
