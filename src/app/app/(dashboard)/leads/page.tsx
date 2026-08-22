import Link from "next/link";
import { AlertTriangle, Phone as PhoneIcon } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { listActiveServices, listDistinctLeadSources, listLeads } from "@/lib/crm/leads";
import { listCalls } from "@/lib/callrail/calls";
import { formatPhoneForDisplay } from "@/lib/phone";
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
const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" });

type FeedRow =
  | { kind: "lead"; when: Date; lead: Awaited<ReturnType<typeof listLeads>>["rows"][number] }
  | { kind: "call"; when: Date; call: Awaited<ReturnType<typeof listCalls>>["rows"][number] };

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
  const page = params.page ? Number(params.page) : 1;
  // Filters (search/status/source/emergency) apply to leads only — calls
  // don't have those fields. Only page 1 merges in recent calls; the leads
  // list itself remains correctly paginated on its own beyond that.
  const hasLeadFilter = Boolean(
    params.search || params.status || params.source || params.emergency,
  );
  const shouldMergeCalls = page === 1 && !hasLeadFilter;

  const [{ rows, total }, callsResult, sources, services] = await Promise.all([
    listLeads(db, {
      search: params.search,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: params.status as any,
      source: params.source,
      emergencyOnly: params.emergency === "1",
      page,
      pageSize: PAGE_SIZE,
    }),
    shouldMergeCalls
      ? listCalls(db, { status: "all", page: 1, pageSize: PAGE_SIZE })
      : Promise.resolve({ rows: [], total: 0 }),
    listDistinctLeadSources(db),
    listActiveServices(db),
  ]);

  const feed: FeedRow[] = shouldMergeCalls
    ? [
        ...rows.map((lead): FeedRow => ({ kind: "lead", when: lead.createdAt, lead })),
        ...callsResult.rows.map((call): FeedRow => ({ kind: "call", when: call.occurredAt, call })),
      ]
        .sort((a, b) => b.when.getTime() - a.when.getTime())
        .slice(0, PAGE_SIZE)
    : rows.map((lead): FeedRow => ({ kind: "lead", when: lead.createdAt, lead }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Leads</h1>
        <NewLeadDialog services={services} />
      </div>

      <LeadFilters sources={sources} />

      {feed.length === 0 ? (
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
                <TableHead>Phone</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feed.map((row) =>
                row.kind === "lead" ? (
                  <TableRow key={`lead-${row.lead.id}`}>
                    <TableCell>
                      <Link href={`/leads/${row.lead.id}`} className="font-medium hover:underline">
                        {row.lead.contactName ?? "No contact"}
                      </Link>
                      {row.lead.emergency ? (
                        <Badge variant="destructive" className="ml-2">
                          <AlertTriangle /> Emergency
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.lead.contactPhone ? formatPhoneForDisplay(row.lead.contactPhone) : "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {row.lead.issueDescription ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.lead.originalSource ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.lead.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {DATE_FMT.format(row.lead.createdAt)}
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={`call-${row.call.id}`}>
                    <TableCell>
                      <Link href={`/calls/${row.call.id}`} className="font-medium hover:underline">
                        {row.call.contactName ?? formatPhoneForDisplay(row.call.callerNumber)}
                      </Link>
                      <Badge variant="outline" className="ml-2">
                        <PhoneIcon /> Call
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatPhoneForDisplay(row.call.callerNumber)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {row.call.answered ? "Answered call" : "Missed call"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">Call</TableCell>
                    <TableCell>
                      {row.call.ignored ? (
                        <Badge variant="secondary">Ignored</Badge>
                      ) : row.call.matched ? (
                        <Badge variant="default">Matched</Badge>
                      ) : (
                        <Badge variant="outline">Unmatched</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {DATE_FMT.format(row.call.occurredAt)}
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {total > PAGE_SIZE ? (
        <p className="text-sm text-muted-foreground">
          Showing {rows.length} of {total} leads
          {shouldMergeCalls ? ` + ${callsResult.rows.length} recent calls` : ""}
        </p>
      ) : shouldMergeCalls && callsResult.rows.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Showing {rows.length} leads + {callsResult.rows.length} recent calls
        </p>
      ) : null}
    </div>
  );
}
