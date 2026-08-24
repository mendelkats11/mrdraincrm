import { getDb } from "@/lib/db/client";
import { listDistinctServiceAreaRegions, listServiceAreasForAdmin } from "@/lib/website/service-areas";
import { getPublicSiteOrigin } from "@/lib/site-url";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SitePreviewPane } from "@/components/site-preview-pane";
import { NewServiceAreaDialog } from "./new-service-area-dialog";
import { ServiceAreaRowActions } from "./service-area-row-actions";
import { ServiceAreaFilters } from "./service-area-filters";

export default async function WebsiteServiceAreasPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();
  const [areas, regions] = await Promise.all([
    listServiceAreasForAdmin(db, { region: params.region }),
    listDistinctServiceAreaRegions(db),
  ]);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Service Areas</h1>
            <p className="text-sm text-muted-foreground">
              {areas.length} areas — active ones each get their own public page with unique copy
              and imagery. Hidden areas still count toward CallRail attribution/reporting.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ServiceAreaFilters regions={regions} />
            <NewServiceAreaDialog />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Call Now number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.map((area) => (
                <TableRow key={area.id}>
                  <TableCell className="font-medium">{area.name}</TableCell>
                  <TableCell className="text-muted-foreground">{area.region || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {area.callrailTrackingNumber || "— uses site default —"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={area.active ? "default" : "outline"}>
                      {area.active ? "Active" : "Hidden"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ServiceAreaRowActions area={area} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <SitePreviewPane origin={getPublicSiteOrigin()} path="/service-areas" />
    </div>
  );
}
