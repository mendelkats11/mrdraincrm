import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getContact } from "@/lib/crm/contacts";
import {
  detachContactFromPropertyAction,
  removeContactEmailAction,
  removeContactPhoneAction,
} from "@/lib/crm/contact-actions";
import { listContactProperties } from "@/lib/crm/relationships";
import { listRemindersForEntity } from "@/lib/reminders/reminders";
import { getEntityTimeline } from "@/lib/audit/activity";
import { formatPhoneForDisplay } from "@/lib/phone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/activity-timeline";
import { RemindersCard } from "@/components/reminders-card";
import { EditContactDialog } from "./edit-contact-dialog";
import { MergeContactDialog } from "./merge-contact-dialog";
import { DuplicatesSection } from "./duplicates-section";
import { AttachPropertyDialog } from "./attach-property-dialog";
import { AddPhoneDialog } from "./add-phone-dialog";
import { AddEmailDialog } from "./add-email-dialog";
import { RemoveButton } from "@/components/remove-button";
import { BackLink } from "@/components/back-link";
import { ArchiveButton } from "./archive-button";

const ROLE_LABELS: Record<string, string> = {
  primary_contact: "Primary Contact",
  owner: "Owner",
  tenant: "Tenant",
  property_manager: "Property Manager",
  spouse_family: "Spouse/Family",
  business_contact: "Business Contact",
  other: "Other",
};

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const contact = await getContact(db, id);
  if (!contact) notFound();

  const [properties, timeline, reminders] = await Promise.all([
    listContactProperties(db, id),
    getEntityTimeline(db, "contact", id),
    listRemindersForEntity(db, { contactId: id }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <BackLink href="/contacts" label="Back to Contacts" />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            {contact.displayName}
            {contact.archivedAt ? <Badge variant="secondary">Archived</Badge> : null}
          </h1>
          {contact.source ? (
            <p className="text-sm text-muted-foreground">Source: {contact.source}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/jobs/new?contactId=${contact.id}`}>+ New Job</Link>
          </Button>
          <EditContactDialog contact={contact} />
          {!contact.archivedAt ? (
            <MergeContactDialog contact={{ id: contact.id, displayName: contact.displayName }} />
          ) : null}
          <ArchiveButton contactId={contact.id} archived={Boolean(contact.archivedAt)} />
        </div>
      </div>

      {!contact.archivedAt ? (
        <DuplicatesSection contact={{ id: contact.id, displayName: contact.displayName }} />
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Phones</CardTitle>
            <AddPhoneDialog contactId={contact.id} />
          </CardHeader>
          <CardContent>
            {contact.phones.length === 0 ? (
              <p className="text-sm text-muted-foreground">No phone numbers.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {contact.phones.map((phone) => (
                  <li key={phone.id} className="flex items-center justify-between text-sm">
                    <span>
                      {formatPhoneForDisplay(phone.phoneE164)}
                      {phone.isPrimary ? (
                        <Badge variant="outline" className="ml-2">
                          Primary
                        </Badge>
                      ) : null}
                      {phone.label ? (
                        <span className="ml-2 text-muted-foreground">{phone.label}</span>
                      ) : null}
                    </span>
                    <RemoveButton
                      label="Remove phone"
                      onRemove={removeContactPhoneAction.bind(null, contact.id, phone.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Emails</CardTitle>
            <AddEmailDialog contactId={contact.id} />
          </CardHeader>
          <CardContent>
            {contact.emails.length === 0 ? (
              <p className="text-sm text-muted-foreground">No email addresses.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {contact.emails.map((email) => (
                  <li key={email.id} className="flex items-center justify-between text-sm">
                    <span>
                      {email.email}
                      {email.isPrimary ? (
                        <Badge variant="outline" className="ml-2">
                          Primary
                        </Badge>
                      ) : null}
                    </span>
                    <RemoveButton
                      label="Remove email"
                      onRemove={removeContactEmailAction.bind(null, contact.id, email.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Properties</CardTitle>
            <AttachPropertyDialog contactId={contact.id} />
          </CardHeader>
          <CardContent>
            {properties.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not linked to any property.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {properties.map((property) => (
                  <li key={property.id} className="flex items-center justify-between text-sm">
                    <a href={`/properties/${property.propertyId}`} className="hover:underline">
                      {property.addressLine1}, {property.city}
                      <span className="ml-2 text-muted-foreground">
                        {ROLE_LABELS[property.role] ?? property.role}
                      </span>
                    </a>
                    <RemoveButton
                      label="Remove property link"
                      onRemove={detachContactFromPropertyAction.bind(
                        null,
                        contact.id,
                        property.propertyId,
                      )}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {contact.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{contact.notes}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <RemindersCard reminders={reminders} contactId={contact.id} />
        </CardContent>
      </Card>

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
