import {
  type DateRange,
  type DateRangePreset,
  isDateRangePreset,
  resolveDateRange,
} from "./date-ranges";

export interface ReportSearchParams {
  range?: string;
  start?: string;
  end?: string;
}

/** Shared by every /reports page's server component — resolves the same
 *  ?range=&start=&end= query params the client-side DateRangeFilter writes
 *  (src/app/app/(dashboard)/reports/date-range-filter.tsx) into an actual
 *  instant range. Defaults to "this month" when nothing is set. */
export function resolveReportDateRange(searchParams: ReportSearchParams): DateRange {
  const preset: DateRangePreset =
    searchParams.range && isDateRangePreset(searchParams.range) ? searchParams.range : "this_month";
  const custom =
    searchParams.start && searchParams.end
      ? { start: searchParams.start, end: searchParams.end }
      : undefined;
  return resolveDateRange(preset, custom);
}
