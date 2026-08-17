"use client";

import { useRouter } from "next/navigation";
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
      <Input name="q" type="search" placeholder="Search contacts, organizations, properties…" />
    </form>
  );
}
