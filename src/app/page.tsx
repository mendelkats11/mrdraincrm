import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background p-8">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Mr. Drain <Badge variant="outline">Phase 0</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Project foundation is set up. Public site and private app routing are built starting in
          later phases per{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-sm">docs/ROADMAP.md</code>.
        </CardContent>
      </Card>
    </div>
  );
}
