import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { listContractors } from "@/lib/contractors/contractors";
import { getContractorStats } from "@/lib/contractors/assignments";
import { formatPhoneForDisplay } from "@/lib/phone";
import { formatCents } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewContractorDialog } from "./new-contractor-dialog";
import { ContractorFilters } from "./contractor-filters";
import { ContractorRowActions } from "./contractor-row-actions";

const PAGE_SIZE = 25;

export default async function ContractorsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: "active" | "inactive" | "all";
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const db = getDb();

  const { rows, total } = await listContractors(db, {
    search: params.search,
    status: params.status,
    page: params.page ? Number(params.page) : 1,
    pageSize: PAGE_SIZE,
  });

  const stats = await Promise.all(rows.map((c) => getContractorStats(db, c.id)));
  const contractorsWithStats = rows.map((contractor, i) => ({
    ...contractor,
    stats: stats[i],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Contractors</h1>
        <NewContractorDialog />
      </div>

      <ContractorFilters />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No contractors yet.
          <br />
          Use the <span className="font-medium text-foreground">+ New Contractor</span> button above
          to add one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Jobs Completed</TableHead>
                <TableHead>Outstanding Payout</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractorsWithStats.map((contractor) => (
                <TableRow key={contractor.id}>
                  <TableCell>
                    <Link
                      href={`/contractors/${contractor.id}`}
                      className="font-medium hover:underline"
                    >
                      {contractor.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contractor.phone ? formatPhoneForDisplay(contractor.phone) : "—"}
                  </TableCell>
                  <TableCell>
                    {contractor.active ? (
                      <Badge variant="outline">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contractor.stats.jobsCompleted}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatCents(contractor.stats.outstandingPayoutCents)}
                  </TableCell>
                  <TableCell>
                    <ContractorRowActions contractorId={contractor.id} active={contractor.active} />
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
