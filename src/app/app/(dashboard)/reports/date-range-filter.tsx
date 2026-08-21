"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DATE_RANGE_PRESETS,
  DATE_RANGE_PRESET_LABELS,
  isDateRangePreset,
} from "@/lib/reports/date-ranges";

/** Shared across every /reports page — reads/writes ?range=&start=&end= so
 *  each report page's server component can resolve the same date range the
 *  same way (src/lib/reports/date-ranges.ts), and switching between report
 *  pages naturally keeps the current selection via the query string. */
export function DateRangeFilter({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const range = searchParams.get("range") ?? "this_month";
  const preset = isDateRangePreset(range) ? range : "this_month";

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={preset} onValueChange={(v) => updateParam("range", v)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_PRESETS.map((p) => (
            <SelectItem key={p} value={p}>
              {DATE_RANGE_PRESET_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {preset === "custom" ? (
        <>
          <Input
            type="date"
            value={searchParams.get("start") ?? ""}
            onChange={(e) => updateParam("start", e.target.value || null)}
            aria-label="Start date"
            className="w-40"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={searchParams.get("end") ?? ""}
            onChange={(e) => updateParam("end", e.target.value || null)}
            aria-label="End date"
            className="w-40"
          />
        </>
      ) : null}
    </div>
  );
}
