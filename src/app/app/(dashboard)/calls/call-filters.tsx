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

export function CallFilters() {
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
    <Select
      value={searchParams.get("status") ?? "all"}
      onValueChange={(v) => updateParam("status", v === "all" ? null : v)}
    >
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All calls</SelectItem>
        <SelectItem value="unmatched">Unmatched</SelectItem>
        <SelectItem value="matched">Matched</SelectItem>
        <SelectItem value="ignored">Ignored</SelectItem>
      </SelectContent>
    </Select>
  );
}
