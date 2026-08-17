"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPES = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "multi_unit", label: "Multi-unit" },
  { value: "industrial", label: "Industrial" },
  { value: "other", label: "Other" },
] as const;

export function PropertyFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`/properties?${params.toString()}`));
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search !== (searchParams.get("search") ?? "")) {
        updateParam("search", search || null);
      }
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search address, city…"
        className="max-w-xs"
        aria-label="Search properties"
      />
      <Select
        value={searchParams.get("status") ?? "active"}
        onValueChange={(v) => updateParam("status", v === "active" ? null : v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("propertyType") ?? "all"}
        onValueChange={(v) => updateParam("propertyType", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
