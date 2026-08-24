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

/** Lets the owner view all service areas together, or narrow to one region (e.g. SK vs BC) — see region column comment in src/lib/db/schema/website.ts. */
export function ServiceAreaFilters({ regions }: { regions: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  if (regions.length === 0) return null;

  function updateRegion(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("region");
    else params.set("region", value);
    startTransition(() => router.push(`/website/service-areas?${params.toString()}`));
  }

  return (
    <Select value={searchParams.get("region") ?? "all"} onValueChange={updateRegion}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All regions</SelectItem>
        {regions.map((region) => (
          <SelectItem key={region} value={region}>
            {region}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
