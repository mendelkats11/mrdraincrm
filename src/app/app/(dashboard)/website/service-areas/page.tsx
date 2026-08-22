import { getDb } from "@/lib/db/client";
import { listServiceAreasForAdmin } from "@/lib/website/service-areas";
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

export default async function WebsiteServiceAreasPage() {
  const db = getDb();
  const areas = await listServiceAreasForAdmin(db);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Service Areas</h1>
            <p className="text-sm text-muted-foreground">
              {areas.length} areas — each gets its own public page with unique copy and imagery.
            </p>
          </div>
          <NewServiceAreaDialog />
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Call Now number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.map((area) => (
                <TableRow key={area.id}>
                  <TableCell className="font-medium">{area.name}</TableCell>
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
