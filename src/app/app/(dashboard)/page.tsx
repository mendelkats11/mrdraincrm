import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/require-user";

export default async function DashboardPage() {
  const session = await requireUser();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Mr. Drain <Badge variant="outline">Phase 2</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        You&apos;re authenticated as <span className="text-foreground">{session.user.name}</span> (
        {session.user.email}). CRM, jobs, and the rest of the dashboard are built starting in later
        phases per <code className="rounded bg-muted px-1 py-0.5 text-sm">docs/ROADMAP.md</code>.
      </CardContent>
    </Card>
  );
}
