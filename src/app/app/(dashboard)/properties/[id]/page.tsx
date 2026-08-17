import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getProperty } from "@/lib/crm/properties";
import { detachContactFromPropertyAction } from "@/lib/crm/contact-actions";
import { listPropertyContacts } from "@/lib/crm/relationships";
import { getEntityTimeline } from "@/lib/audit/activity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/activity-timeline";
import { RemoveButton } from "@/components/remove-button";
import { EditPropertyDialog } from "./edit-property-dialog";
import { AttachContactDialog } from "./attach-contact-dialog";
import { ArchiveButton } from "./archive-button";

const TYPE_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  multi_unit: "Multi-unit",
  industrial: "Industrial",
  other: "Other",
};

const ROLE_LABELS: Record<string, string> = {
  primary_contact: "Primary Contact",
  owner: "Owner",
  tenant: "Tenant",
  property_manager: "Property Manager",
  spouse_family: "Spouse/Family",
  business_contact: "Business Contact",
  other: "Other",
};

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const property = await getProperty(db, id);
  if (!property) notFound();

  const [contacts, timeline] = await Promise.all([
    listPropertyContacts(db, id),
    getEntityTimeline(db, "property", id),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            {property.addressLine1}
            {property.archivedAt ? <Badge variant="secondary">Archived</Badge> : null}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[property.addressLine2, property.city, property.province, property.postalCode]
              .filter(Boolean)
              .join(", ")}{" "}
            · <Badge variant="outline">{TYPE_LABELS[property.propertyType]}</Badge>
            {property.organizationName ? (
              <>
                {" "}
                ·{" "}
                <a href={`/organizations/${property.organizationId}`} className="hover:underline">
                  {property.organizationName}
                </a>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/jobs/new?propertyId=${property.id}`}>+ New Job</Link>
          </Button>
          <EditPropertyDialog property={property} />
          <ArchiveButton propertyId={property.id} archived={Boolean(property.archivedAt)} />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Contacts</CardTitle>
          <AttachContactDialog propertyId={property.id} />
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts linked yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <a href={`/contacts/${c.contactId}`} className="hover:underline">
                    {c.displayName}
                    <span className="ml-2 text-muted-foreground">
                      {ROLE_LABELS[c.role] ?? c.role}
                    </span>
                  </a>
                  <RemoveButton
                    label="Remove contact link"
                    onRemove={detachContactFromPropertyAction.bind(null, c.contactId, property.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {property.businessName || property.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {property.businessName ? <p>Business: {property.businessName}</p> : null}
            {property.notes ? <p className="whitespace-pre-wrap">{property.notes}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline entries={timeline} />
        </CardContent>
      </Card>
    </div>
  );
}
