import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { listCalls, type ListCallsFilters } from "@/lib/callrail/calls";
import { listServiceAreasForAdmin } from "@/lib/website/service-areas";
import { formatPhoneForDisplay } from "@/lib/phone";
import { BUSINESS_TIMEZONE } from "@/lib/reminders/timezone";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/pagination-bar";
import { CallDirectionIcon } from "@/components/call-direction-icon";
import { CallFilters } from "./call-filters";

// Filters/sort read searchParams every request — never statically cached,
// so switching "Unmatched" -> "All calls" always reflects the real,
// current table rather than a stale prefetched segment.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const VALID_STATUSES: NonNullable<ListCallsFilters["status"]>[] = [
  "unmatched",
  "matched",
  "ignored",
  "all",
];
const VALID_SORTS: NonNullable<ListCallsFilters["sort"]>[] = [
  "newest",
  "oldest",
  "longest",
  "shortest",
];

// This renders server-side (force-dynamic, no "use client"), so without an
// explicit timeZone it formats in whatever timezone the server process
// runs in (UTC on the production host) rather than the business's own
// timezone — the exact cause of calls appearing hours off. See
// src/lib/reminders/timezone.ts's BUSINESS_TIMEZONE for the same fix
// already applied to reminders.
const DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: BUSINESS_TIMEZONE,
});

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    serviceAreaId?: string;
    answered?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const db = getDb();

  // Defaults to "all", not "unmatched" — the previous unmatched-by-default
  // repeatedly read as "recent calls are missing" (they weren't; matched
  // calls were just filtered out of view), since the owner's most recent
  // calls are often from already-matched repeat customers.
  const status = VALID_STATUSES.includes(params.status as NonNullable<ListCallsFilters["status"]>)
    ? (params.status as NonNullable<ListCallsFilters["status"]>)
    : "all";
  const sort = VALID_SORTS.includes(params.sort as NonNullable<ListCallsFilters["sort"]>)
    ? (params.sort as NonNullable<ListCallsFilters["sort"]>)
    : "newest";
  const answered =
    params.answered === "yes" || params.answered === "no" ? params.answered : undefined;
  const page = params.page ? Number(params.page) : 1;

  const [{ rows, total, pageSize }, serviceAreas] = await Promise.all([
    listCalls(db, {
      status,
      serviceAreaId: params.serviceAreaId || undefined,
      answered,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
    listServiceAreasForAdmin(db),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Calls</h1>

      <CallFilters serviceAreas={serviceAreas.map((a) => ({ id: a.id, name: a.name }))} />

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
                    <div className="flex items-center gap-2">
                      <CallDirectionIcon direction={call.direction} />
                      <Link href={`/calls/${call.id}`} className="font-medium hover:underline">
                        {call.contactName ?? formatPhoneForDisplay(call.callerNumber)}
                      </Link>
                    </div>
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

      <PaginationBar page={page} pageSize={pageSize} total={total} basePath="/calls" />
    </div>
  );
}
