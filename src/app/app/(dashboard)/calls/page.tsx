import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { listCalls, type ListCallsFilters } from "@/lib/callrail/calls";
import { formatPhoneForDisplay } from "@/lib/phone";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CallFilters } from "./call-filters";

const PAGE_SIZE = 25;
const VALID_STATUSES: NonNullable<ListCallsFilters["status"]>[] = [
  "unmatched",
  "matched",
  "ignored",
  "all",
];

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" });

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();

  const status = VALID_STATUSES.includes(params.status as NonNullable<ListCallsFilters["status"]>)
    ? (params.status as NonNullable<ListCallsFilters["status"]>)
    : "unmatched";

  const { rows, total } = await listCalls(db, {
    status,
    page: params.page ? Number(params.page) : 1,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Calls</h1>

      <CallFilters />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No calls here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caller</TableHead>
                <TableHead>Service area</TableHead>
                <TableHead>Answered</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((call) => (
                <TableRow key={call.id}>
                  <TableCell>
                    <Link href={`/calls/${call.id}`} className="font-medium hover:underline">
                      {call.contactName ?? formatPhoneForDisplay(call.callerNumber)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {call.serviceAreaName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {call.answered ? "Yes" : "Missed"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDuration(call.durationSeconds)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {DATE_FMT.format(call.occurredAt)}
                  </TableCell>
                  <TableCell>
                    {call.ignored ? (
                      <Badge variant="secondary">Ignored</Badge>
                    ) : call.matched ? (
                      <Badge variant="default">Matched</Badge>
                    ) : (
                      <Badge variant="outline">Unmatched</Badge>
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
