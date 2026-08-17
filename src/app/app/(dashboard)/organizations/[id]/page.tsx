import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getOrganization } from "@/lib/crm/organizations";
import { detachContactFromOrganizationAction } from "@/lib/crm/contact-actions";
import { listOrganizationContacts, listOrganizationProperties } from "@/lib/crm/relationships";
import { getEntityTimeline } from "@/lib/audit/activity";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/activity-timeline";
import { EditOrganizationDialog } from "./edit-organization-dialog";
import { AttachContactDialog } from "./attach-contact-dialog";
import { ArchiveButton } from "./archive-button";
import { RemoveButton } from "@/components/remove-button";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const organization = await getOrganization(db, id);
  if (!organization) notFound();

  const [contacts, properties, timeline] = await Promise.all([
    listOrganizationContacts(db, id),
    listOrganizationProperties(db, id),
    getEntityTimeline(db, "organization", id),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            {organization.name}
            {organization.archivedAt ? <Badge variant="secondary">Archived</Badge> : null}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[organization.phone, organization.email, organization.address]
              .filter(Boolean)
              .join(" · ") || "No contact details on file"}
          </p>
        </div>
        <div className="flex gap-2">
          <EditOrganizationDialog organization={organization} />
          <ArchiveButton
            organizationId={organization.id}
            archived={Boolean(organization.archivedAt)}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Contacts</CardTitle>
            <AttachContactDialog organizationId={organization.id} />
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
                      {c.title ? (
                        <span className="ml-2 text-muted-foreground">{c.title}</span>
                      ) : null}
                    </a>
                    <RemoveButton
                      label="Remove contact link"
                      onRemove={detachContactFromOrganizationAction.bind(
                        null,
                        c.contactId,
                        organization.id,
                      )}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Properties</CardTitle>
          </CardHeader>
          <CardContent>
            {properties.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No properties linked. Set this organization from a property&apos;s edit form.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {properties.map((p) => (
                  <li key={p.id} className="text-sm">
                    <a href={`/properties/${p.id}`} className="hover:underline">
                      {p.addressLine1}, {p.city}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {organization.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{organization.notes}</CardContent>
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
