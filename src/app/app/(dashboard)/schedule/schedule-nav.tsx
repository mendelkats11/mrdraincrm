import Link from "next/link";
import { Button } from "@/components/ui/button";
import { addDays, addMonths, toDateParam } from "@/lib/schedule/ranges";
import type { ScheduleView } from "./view-range";

const VIEWS: { value: ScheduleView; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "list", label: "List" },
];

function shiftDate(view: ScheduleView, date: Date, direction: 1 | -1): Date {
  if (view === "month") return addMonths(date, direction);
  if (view === "week" || view === "list") return addDays(date, 7 * direction);
  return addDays(date, direction);
}

export function ScheduleNav({ view, date }: { view: ScheduleView; date: Date }) {
  const prevDate = shiftDate(view, date, -1);
  const nextDate = shiftDate(view, date, 1);
  const today = new Date();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <Button asChild variant="outline" size="sm">
          <Link href={`/schedule?view=${view}&date=${toDateParam(prevDate)}`}>Previous</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/schedule?view=${view}&date=${toDateParam(today)}`}>Today</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/schedule?view=${view}&date=${toDateParam(nextDate)}`}>Next</Link>
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {VIEWS.map((v) => (
          <Button
            key={v.value}
            asChild
            variant={view === v.value ? "default" : "outline"}
            size="sm"
          >
            <Link href={`/schedule?view=${v.value}&date=${toDateParam(date)}`}>{v.label}</Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
