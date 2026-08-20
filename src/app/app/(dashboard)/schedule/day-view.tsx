import { ScheduleJobRow, type ScheduledJobWithContractor } from "./schedule-job-row";

export function DayView({ jobs }: { jobs: ScheduledJobWithContractor[] }) {
  const timed = jobs.filter((j) => !j.timeTbd);
  const anyTime = jobs.filter((j) => j.timeTbd);

  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No jobs scheduled for this day.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {timed.length > 0 ? (
        <div className="flex flex-col gap-2">
          {timed.map((job) => (
            <ScheduleJobRow key={job.id} job={job} />
          ))}
        </div>
      ) : null}

      {anyTime.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Any time</h2>
          {anyTime.map((job) => (
            <ScheduleJobRow key={job.id} job={job} showTime={false} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
