"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearJobScheduleAction, updateJobScheduleAction } from "@/lib/jobs/schedule-actions";
import { formatScheduleSummary } from "@/lib/schedule/format";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toTimeInputValue(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function ScheduleSection({
  jobId,
  scheduledStart,
  scheduledEnd,
  timeTbd,
}: {
  jobId: string;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  timeTbd: boolean;
}) {
  const [tbdChecked, setTbdChecked] = useState(timeTbd);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [clearPending, startClearTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateJobScheduleAction(undefined, formData);
      if (result?.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  function handleClear() {
    startClearTransition(async () => {
      await clearJobScheduleAction(jobId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {scheduledStart
          ? `Currently: ${formatScheduleSummary({ scheduledStart, scheduledEnd, timeTbd })}`
          : "Not scheduled."}
      </p>

      <form action={handleSubmit} className="flex flex-col gap-3">
        <input type="hidden" name="jobId" value={jobId} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="schedule-date">Date</Label>
          <Input
            id="schedule-date"
            name="date"
            type="date"
            required
            defaultValue={scheduledStart ? toDateInputValue(scheduledStart) : ""}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="schedule-tbd"
            name="timeTbd"
            checked={tbdChecked}
            onCheckedChange={(checked) => setTbdChecked(checked === true)}
          />
          <Label htmlFor="schedule-tbd" className="font-normal">
            Time TBD
          </Label>
        </div>

        {!tbdChecked ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="schedule-start-time">Start time</Label>
              <Input
                id="schedule-start-time"
                name="startTime"
                type="time"
                defaultValue={scheduledStart ? toTimeInputValue(scheduledStart) : ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="schedule-end-time">End time (optional)</Label>
              <Input
                id="schedule-end-time"
                name="endTime"
                type="time"
                defaultValue={scheduledEnd ? toTimeInputValue(scheduledEnd) : ""}
              />
            </div>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save schedule"}
          </Button>
          {scheduledStart ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={clearPending}
              onClick={handleClear}
            >
              {clearPending ? "Clearing…" : "Clear schedule"}
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
