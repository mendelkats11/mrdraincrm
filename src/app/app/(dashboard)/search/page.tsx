import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { searchCrm } from "@/lib/crm/search";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Basic results page — the live-typeahead "polished" search experience is
// an explicit docs/ROADMAP.md Phase 17 deliverable, not this phase's.
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const db = getDb();
  const results = q ? await searchCrm(db, q) : [];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">
        {q ? (
          <>
            Search results for <span className="text-muted-foreground">&ldquo;{q}&rdquo;</span>
          </>
        ) : (
          "Search"
        )}
      </h1>

      {q && results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matches for &ldquo;{q}&rdquo;.</p>
      ) : null}

      <div className="flex flex-col gap-2">
        {results.map((result) => (
          <Link key={`${result.type}-${result.id}`} href={result.href}>
            <Card className="transition-colors hover:border-primary">
              <CardContent className="flex items-center justify-between py-3">
                <span className="font-medium">{result.title}</span>
                {result.subtitle ? <Badge variant="outline">{result.subtitle}</Badge> : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
