import Link from "next/link";
import { cn } from "@/lib/utils";

const REPORT_TABS = [
  { href: "/reports/financial", label: "Financial" },
  { href: "/reports/contractors", label: "Contractors" },
  { href: "/reports/jobs", label: "Jobs" },
  { href: "/reports/leads", label: "Leads" },
  { href: "/reports/callrail", label: "CallRail" },
] as const;

export function ReportNav({ active }: { active: (typeof REPORT_TABS)[number]["href"] }) {
  return (
    <div className="flex flex-wrap gap-1 border-b">
      {REPORT_TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
            tab.href === active
              ? "border-x border-t border-b-2 border-b-background bg-background text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
