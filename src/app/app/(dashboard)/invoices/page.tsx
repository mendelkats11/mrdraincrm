import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { listInvoices, type InvoiceStatus } from "@/lib/invoices/invoices";
import { formatCents } from "@/lib/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { InvoiceFilters } from "./invoice-filters";
import { InvoiceStatusBadge } from "./invoice-status-badge";

const PAGE_SIZE = 25;
const VALID_STATUSES: InvoiceStatus[] = ["draft", "sent", "partially_paid", "paid", "void"];

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" });

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();

  const status = VALID_STATUSES.includes(params.status as InvoiceStatus)
    ? (params.status as InvoiceStatus)
    : "all";

  const { rows, total } = await listInvoices(db, {
    search: params.search,
    status,
    page: params.page ? Number(params.page) : 1,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Invoices</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/invoices/settings">Invoice settings</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/invoices/new">+ New Invoice</Link>
          </Button>
        </div>
      </div>

      <InvoiceFilters />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No invoices yet.
          <br />
          Create one from a job&apos;s detail page, or{" "}
          <Link href="/invoices/new" className="underline">
            start from scratch
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Link href={`/invoices/${invoice.id}`} className="font-medium hover:underline">
                      {invoice.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Link href={`/jobs/${invoice.jobId}`} className="hover:underline">
                      {invoice.jobNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {invoice.customerName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell>{formatCents(invoice.totalCents)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {DATE_FMT.format(invoice.createdAt)}
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
