import { getDb } from "@/lib/db/client";
import { listServicesForAdmin } from "@/lib/website/services";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NewServiceDialog } from "./new-service-dialog";
import { ServiceRowActions } from "./service-row-actions";

export default async function WebsiteServicesPage() {
  const db = getDb();
  const services = await listServicesForAdmin(db);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Services</h1>
          <p className="text-sm text-muted-foreground">
            {services.length} services — shown on the public Services page in this order.
          </p>
        </div>
        <NewServiceDialog />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell className="font-medium">{service.name}</TableCell>
                <TableCell>
                  <Badge variant={service.active ? "default" : "outline"}>
                    {service.active ? "Active" : "Hidden"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <ServiceRowActions service={service} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
