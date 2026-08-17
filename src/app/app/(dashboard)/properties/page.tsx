import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { listProperties, type PropertyType } from "@/lib/crm/properties";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewPropertyDialog } from "./new-property-dialog";
import { PropertyFilters } from "./property-filters";
import { PropertyRowActions } from "./property-row-actions";

const PAGE_SIZE = 25;

const TYPE_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  multi_unit: "Multi-unit",
  industrial: "Industrial",
  other: "Other",
};

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: "active" | "archived" | "all";
    propertyType?: PropertyType;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const db = getDb();

  const { rows, total } = await listProperties(db, {
    search: params.search,
    status: params.status,
    propertyType: params.propertyType,
    page: params.page ? Number(params.page) : 1,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Properties</h1>
        <NewPropertyDialog />
      </div>

      <PropertyFilters />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No properties yet.
          <br />
          Use the <span className="font-medium text-foreground">+ New Property</span> button above
          to add one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((property) => (
                <TableRow key={property.id}>
                  <TableCell>
                    <Link
                      href={`/properties/${property.id}`}
                      className="font-medium hover:underline"
                    >
                      {property.addressLine1}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{property.city}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {TYPE_LABELS[property.propertyType] ?? property.propertyType}
                  </TableCell>
                  <TableCell>
                    {property.archivedAt ? (
                      <Badge variant="secondary">Archived</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <PropertyRowActions
                      propertyId={property.id}
                      archived={Boolean(property.archivedAt)}
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
