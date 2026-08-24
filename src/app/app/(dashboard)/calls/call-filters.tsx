"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CallFilters({
  serviceAreas,
}: {
  serviceAreas: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`/calls?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={searchParams.get("status") ?? "all"}
        onValueChange={(v) => updateParam("status", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All calls</SelectItem>
          <SelectItem value="unmatched">Unmatched</SelectItem>
          <SelectItem value="matched">Matched</SelectItem>
          <SelectItem value="ignored">Ignored</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("serviceAreaId") ?? "all"}
        onValueChange={(v) => updateParam("serviceAreaId", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Service area" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All service areas</SelectItem>
          {serviceAreas.map((area) => (
            <SelectItem key={area.id} value={area.id}>
              {area.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("answered") ?? "all"}
        onValueChange={(v) => updateParam("answered", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Answered + missed</SelectItem>
          <SelectItem value="yes">Answered only</SelectItem>
          <SelectItem value="no">Missed only</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("sort") ?? "newest"}
        onValueChange={(v) => updateParam("sort", v === "newest" ? null : v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="oldest">Oldest first</SelectItem>
          <SelectItem value="longest">Longest duration</SelectItem>
          <SelectItem value="shortest">Shortest duration</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
