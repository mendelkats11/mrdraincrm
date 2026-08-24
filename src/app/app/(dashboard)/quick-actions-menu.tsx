"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// docs/PROJECT_SPEC.md §23 — persistent "+ New" quick action, reachable
// from anywhere in the app. Job/Invoice/Quote already have dedicated /new
// pages, linked directly. Contact/Property/Reminder are each created via a
// dialog scoped to their own list page (e.g. NewContactDialog on
// /contacts) — rather than duplicating that logic here, `?new=1` tells the
// destination page to auto-open its existing dialog on arrival (see each
// page's "New*Dialog" component). Record Payment and Upload Photos both
// belong to a specific job, which nothing global can pick for the user —
// routed to the Jobs list to choose one, where both actions already live
// on the job detail page.
//
// No "New Lead" here (owner decision) — leads now only ever originate
// from the website form or a CallRail call, both already captured
// automatically; nothing left needs a manual entry point. The /leads
// route (list, detail, status, convert-to-job) is untouched underneath,
// just no longer linked from anywhere in the UI.
const QUICK_ACTIONS = [
  { group: "Create", label: "New Job", href: "/jobs/new" },
  { group: "Create", label: "New Contact", href: "/contacts?new=1" },
  { group: "Create", label: "New Property", href: "/properties?new=1" },
  { group: "Create", label: "New Reminder", href: "/reminders?new=1" },
  { group: "Billing", label: "New Invoice", href: "/invoices/new" },
  { group: "Billing", label: "New Quote", href: "/quotes/new" },
  { group: "Billing", label: "Record Payment", href: "/jobs" },
  { group: "Jobs", label: "Upload Photos", href: "/jobs" },
] as const;

export function QuickActionsMenu() {
  const groups = [...new Set(QUICK_ACTIONS.map((a) => a.group))];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="size-4" />
          New
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {groups.map((group, i) => (
          <DropdownMenuGroup key={group}>
            {i > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="text-xs text-muted-foreground">{group}</DropdownMenuLabel>
            {QUICK_ACTIONS.filter((a) => a.group === group).map((action) => (
              <DropdownMenuItem key={action.label} asChild>
                <Link href={action.href}>{action.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
