import { getDb } from "@/lib/db/client";
import { getContact } from "@/lib/crm/contacts";
import { getProperty } from "@/lib/crm/properties";
import { appSettings } from "@/lib/db/schema";
import { getStorageProvider } from "@/lib/storage";
import { resolveLogoUrl } from "@/lib/pdf/logo";
import { NewQuoteForm } from "./new-quote-form";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ contactId?: string; propertyId?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();

  const [prefillContact, prefillProperty, [settings]] = await Promise.all([
    params.contactId ? getContact(db, params.contactId) : null,
    params.propertyId ? getProperty(db, params.propertyId) : null,
    db.select().from(appSettings).limit(1),
  ]);

  // Quotes always render with the business's current name/address/logo at
  // PDF-generation time rather than snapshotting them (src/lib/pdf/
  // quote-pdf-generator.tsx) — the live preview below mirrors that exactly,
  // so what the owner sees while creating a quote matches what actually
  // renders.
  let logoUrl: string | null = null;
  if (settings?.logoKey) {
    try {
      logoUrl = await resolveLogoUrl(getStorageProvider(), settings.logoKey);
    } catch {
      logoUrl = null;
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
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
        businessName={settings?.businessName ?? null}
        businessAddress={settings?.businessAddress ?? null}
        logoUrl={logoUrl}
      />
    </div>
  );
}
