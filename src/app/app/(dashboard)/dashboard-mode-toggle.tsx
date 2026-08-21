"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { setDashboardModeAction } from "@/lib/dashboard/dashboard-actions";
import type { DashboardMode } from "@/lib/preferences/user-preferences";
import { cn } from "@/lib/utils";

// docs/PROJECT_SPEC.md §21 — the toggle both updates the URL immediately
// (so the current view is right away) and persists the choice server-side
// (so "preferences persist per user" — Phase 17's acceptance criterion —
// holds the next time they open the dashboard from a fresh URL).
export function DashboardModeToggle({ mode }: { mode: DashboardMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function select(next: DashboardMode) {
    if (next === mode) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", next);
    router.push(`/?${params.toString()}`);
    startTransition(async () => {
      await setDashboardModeAction(next);
    });
  }

  return (
    <div className="inline-flex rounded-md border p-0.5" role="tablist" aria-label="Dashboard view">
      {(["operations", "financial"] as const).map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={mode === option}
          disabled={pending}
          onClick={() => select(option)}
          className={cn(
            "rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors",
            mode === option
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
