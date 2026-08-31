import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { searchCrm, type SearchResult } from "@/lib/crm/search";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// overhaul.md §16 — a result must communicate what *kind* of record it is,
// not just its name/number, or a list of jobs/quotes/properties reads as an
// ambiguous list of numbers and addresses. This label is always shown;
// result.subtitle (when present) is separate, genuinely secondary info
// (the linked contact, a phone number, etc.), not a stand-in for the type.
const TYPE_LABELS: Record<SearchResult["type"], string> = {
  contact: "Contact",
  property: "Property",
  lead: "Lead",
  job: "Job",
  contractor: "Contractor",
  invoice: "Invoice",
  quote: "Quote",
  call: "Call",
  message: "Message",
};

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

      {!q ? (
        <p className="text-sm text-muted-foreground">
          Search by name, address, phone, email, or record number — contacts, properties, leads,
          jobs, invoices, quotes, calls, and messages.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {results.map((result) => (
          <Link key={`${result.type}-${result.id}`} href={result.href}>
            <Card className="transition-colors hover:border-primary">
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{result.title}</span>
                  {result.subtitle ? (
                    <span className="truncate text-sm text-muted-foreground">
                      {result.subtitle}
                    </span>
                  ) : null}
                </div>
                <Badge variant="outline" className="shrink-0">
                  {TYPE_LABELS[result.type]}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
