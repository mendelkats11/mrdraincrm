import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { listLeads } from "@/lib/crm/leads";
import { formatPhoneForDisplay } from "@/lib/phone";
import { BUSINESS_TIMEZONE } from "@/lib/reminders/timezone";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "../leads/status-badge";

const PAGE_SIZE = 25;
const DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: BUSINESS_TIMEZONE,
});

// The public quote-request form (src/app/api/leads/route.ts) always creates
// a lead with originalSource "website" (src/lib/crm/leads.ts,
// createLeadFromPublicSubmission) — this page is that same data, filtered
// to just the form-submitted ones, so the front desk has a dedicated place
// to review raw submissions without the noise of manually-entered leads.
const FORM_SOURCE = "website";

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();

  const { rows, total } = await listLeads(db, {
    source: FORM_SOURCE,
    status: "all",
    page: params.page ? Number(params.page) : 1,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Form Submissions</h1>
        <p className="text-sm text-muted-foreground">
          Every quote request submitted through the website contact form.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No form submissions yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
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
                  <TableCell className="text-muted-foreground">
                    {lead.contactPhone ? formatPhoneForDisplay(lead.contactPhone) : "—"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {lead.issueDescription ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {DATE_FMT.format(lead.createdAt)}
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
