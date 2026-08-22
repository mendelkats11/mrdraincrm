"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

// Basic — the live-typeahead "polished" search experience is an explicit
// docs/ROADMAP.md Phase 17 deliverable, not this phase's.
export function HeaderSearch() {
  const router = useRouter();

  return (
    <form
      role="search"
      className="w-full max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const query = new FormData(e.currentTarget).get("q");
        if (typeof query === "string" && query.trim()) {
          router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
      }}
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          name="q"
          type="search"
          placeholder="Search contacts, properties, leads, jobs…"
          className="rounded-full pl-8"
        />
      </div>
    </form>
  );
}
