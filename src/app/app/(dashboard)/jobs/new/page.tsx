import { getDb } from "@/lib/db/client";
import { listActiveServices } from "@/lib/jobs/jobs";
import { getContact } from "@/lib/crm/contacts";
import { getProperty } from "@/lib/crm/properties";
import { NewJobForm } from "./new-job-form";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ contactId?: string; propertyId?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();

  const [services, prefillContact, prefillProperty] = await Promise.all([
    listActiveServices(db),
    params.contactId ? getContact(db, params.contactId) : null,
    params.propertyId ? getProperty(db, params.propertyId) : null,
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">New job</h1>
      <NewJobForm
        services={services}
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
      />
    </div>
  );
}
