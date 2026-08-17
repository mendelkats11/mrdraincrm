import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { listOrganizations } from "@/lib/crm/organizations";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewOrganizationDialog } from "./new-organization-dialog";
import { OrganizationFilters } from "./organization-filters";
import { OrganizationRowActions } from "./organization-row-actions";

const PAGE_SIZE = 25;

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: "active" | "archived" | "all"; page?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();

  const { rows, total } = await listOrganizations(db, {
    search: params.search,
    status: params.status,
    page: params.page ? Number(params.page) : 1,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Organizations</h1>
        <NewOrganizationDialog />
      </div>

      <OrganizationFilters />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No organizations yet.
          <br />
          Use the <span className="font-medium text-foreground">+ New Organization</span> button
          above to add one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((organization) => (
                <TableRow key={organization.id}>
                  <TableCell>
                    <Link
                      href={`/organizations/${organization.id}`}
                      className="font-medium hover:underline"
                    >
                      {organization.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {organization.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {organization.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    {organization.archivedAt ? (
                      <Badge variant="secondary">Archived</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <OrganizationRowActions
                      organizationId={organization.id}
                      archived={Boolean(organization.archivedAt)}
                    />
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
