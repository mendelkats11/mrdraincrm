"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** One query-param-backed <Select> filter, shared by every /reports page.
 *  `allValue`/`allLabel` is the "no filter" option — selecting it removes
 *  the param entirely rather than writing a sentinel into the URL. */
export function QuerySelectFilter({
  basePath,
  paramKey,
  allLabel,
  options,
  className,
}: {
  basePath: string;
  paramKey: string;
  allLabel: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramKey) ?? "";

  function updateParam(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(paramKey, value);
    else params.delete(paramKey);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <Select
      value={current || "__all__"}
      onValueChange={(v) => updateParam(v === "__all__" ? "" : v)}
    >
      <SelectTrigger className={className ?? "w-44"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
