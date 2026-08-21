import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS = [
  {
    href: "/reports/financial",
    label: "Financial",
    description: "Revenue, profit, and margin, with per-service and per-month breakdowns.",
  },
  {
    href: "/reports/contractors",
    label: "Contractors",
    description: "Job value, payouts, and outstanding balances per contractor.",
  },
  {
    href: "/reports/jobs",
    label: "Jobs",
    description: "Job volume by status and service, including emergencies.",
  },
  {
    href: "/reports/leads",
    label: "Leads",
    description: "Lead volume, source breakdown, and win/loss conversion rate.",
  },
  {
    href: "/reports/callrail",
    label: "CallRail",
    description: "Calls and texts by service area, answered vs. missed, matched vs. unknown.",
  },
] as const;

export default function ReportsIndexPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Every report supports a date range and CSV export; Financial also exports PDF.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{section.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {section.description}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
