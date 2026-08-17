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

export function ContactFilters({ sources }: { sources: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`/contacts?${params.toString()}`));
  }

  // Debounce the free-text search so we're not navigating on every keystroke.
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
        placeholder="Search name, phone, email…"
        className="max-w-xs"
        aria-label="Search contacts"
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
      {sources.length > 0 ? (
        <Select
          value={searchParams.get("source") ?? "all"}
          onValueChange={(v) => updateParam("source", v === "all" ? null : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source} value={source}>
                {source}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
