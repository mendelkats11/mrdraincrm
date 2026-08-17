import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { listActiveServices, listDistinctLeadSources, listLeads } from "@/lib/crm/leads";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewLeadDialog } from "./new-lead-dialog";
import { LeadFilters } from "./lead-filters";
import { StatusBadge } from "./status-badge";

const PAGE_SIZE = 25;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    source?: string;
    emergency?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const db = getDb();

  const [{ rows, total }, sources, services] = await Promise.all([
    listLeads(db, {
      search: params.search,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: params.status as any,
      source: params.source,
      emergencyOnly: params.emergency === "1",
      page: params.page ? Number(params.page) : 1,
      pageSize: PAGE_SIZE,
    }),
    listDistinctLeadSources(db),
    listActiveServices(db),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Leads</h1>
        <NewLeadDialog services={services} />
      </div>

      <LeadFilters sources={sources} />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No leads yet.
          <br />
          Use the <span className="font-medium text-foreground">+ New Lead</span> button above to
          add one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                      {lead.contactName ?? "No contact"}
                    </Link>
                    {lead.emergency ? (
                      <Badge variant="destructive" className="ml-2">
                        <AlertTriangle /> Emergency
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {lead.issueDescription ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {lead.originalSource ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(
                      lead.createdAt,
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > PAGE_SIZE ? (
        <p className="text-sm text-muted-foreground">
          Showing {rows.length} of {total}
        </p>
      ) : null}
    </div>
  );
}
