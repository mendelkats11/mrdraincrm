import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/require-user";

const SECTIONS = [
  {
    href: "/contacts",
    label: "Contacts",
    description: "People, on their own or linked to a property/organization.",
  },
  {
    href: "/organizations",
    label: "Organizations",
    description: "Companies and property managers.",
  },
  {
    href: "/properties",
    label: "Properties",
    description: "Service locations, residential or commercial.",
  },
] as const;

export default async function DashboardPage() {
  const session = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Welcome, {session.user.name} <Badge variant="outline">Phase 3</Badge>
        </h1>
        <p className="text-sm text-muted-foreground">
          CRM is available below. Scheduling, jobs, and financials are built in later phases per{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">docs/ROADMAP.md</code>.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle>{section.label}</CardTitle>
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
