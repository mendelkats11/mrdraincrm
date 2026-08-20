import Link from "next/link";
import { cn } from "@/lib/utils";
import { eachDayInRange, isSameDay, toDateParam } from "@/lib/schedule/ranges";
import { formatTimeRange } from "@/lib/schedule/format";
import type { ScheduledJobWithContractor } from "./schedule-job-row";

const MAX_PREVIEW_PER_DAY = 3;

export function MonthView({
  gridStart,
  gridEnd,
  monthDate,
  jobs,
}: {
  gridStart: Date;
  gridEnd: Date;
  monthDate: Date;
  jobs: ScheduledJobWithContractor[];
}) {
  const days = eachDayInRange(gridStart, gridEnd);
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const today = new Date();

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-1">
          {week.map((day) => {
            const inMonth = day.getMonth() === monthDate.getMonth();
            const dayJobs = jobs.filter((j) => isSameDay(j.scheduledStart, day));
            const isToday = isSameDay(day, today);

            return (
              <Link
                key={day.toISOString()}
                href={`/schedule?view=day&date=${toDateParam(day)}`}
                className={cn(
                  "flex min-h-16 flex-col gap-0.5 rounded-md border p-1 text-xs transition-colors hover:border-primary sm:min-h-24 sm:p-1.5",
                  !inMonth && "opacity-40",
                )}
              >
                <span
                  className={cn(
                    "font-medium text-foreground",
                    isToday &&
                      "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground",
                  )}
                >
                  {day.getDate()}
                </span>

                {/* Desktop: inline previews. */}
                {dayJobs.length > 0 ? (
                  <div className="hidden flex-col gap-0.5 sm:flex">
                    {dayJobs.slice(0, MAX_PREVIEW_PER_DAY).map((job) => (
                      <span key={job.id} className="truncate text-muted-foreground">
                        {formatTimeRange(job)} {job.jobNumber}
                      </span>
                    ))}
                    {dayJobs.length > MAX_PREVIEW_PER_DAY ? (
                      <span className="text-muted-foreground">
                        +{dayJobs.length - MAX_PREVIEW_PER_DAY} more
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {/* Mobile: compact count only. */}
                {dayJobs.length > 0 ? (
                  <span className="text-muted-foreground sm:hidden">
                    {dayJobs.length} job{dayJobs.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
