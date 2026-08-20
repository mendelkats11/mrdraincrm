import { getDb } from "@/lib/db/client";
import { getContact } from "@/lib/crm/contacts";
import { getProperty } from "@/lib/crm/properties";
import { getOrganization } from "@/lib/crm/organizations";
import { NewQuoteForm } from "./new-quote-form";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ contactId?: string; propertyId?: string; organizationId?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();

  const [prefillContact, prefillProperty, prefillOrganization] = await Promise.all([
    params.contactId ? getContact(db, params.contactId) : null,
    params.propertyId ? getProperty(db, params.propertyId) : null,
    params.organizationId ? getOrganization(db, params.organizationId) : null,
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">New quote</h1>
      <NewQuoteForm
        initialContact={
          prefillContact ? { id: prefillContact.id, label: prefillContact.displayName } : null
        }
        initialProperty={
          prefillProperty
            ? {
                id: prefillProperty.id,
                label: `${prefillProperty.addressLine1}, ${prefillProperty.city}`,
              }
            : null
        }
        initialOrganization={
          prefillOrganization
            ? { id: prefillOrganization.id, label: prefillOrganization.name }
            : null
        }
      />
    </div>
  );
}
