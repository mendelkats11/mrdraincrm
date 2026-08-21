import { getDb } from "@/lib/db/client";
import { getInvoiceTemplateSettings } from "@/lib/invoices/invoice-settings";
import { getStorageProvider } from "@/lib/storage";
import { resolveLogoUrl } from "@/lib/pdf/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceSettingsForm } from "./invoice-settings-form";

// Business-wide invoice branding — logo, accent color, font — snapshotted
// onto each invoice at creation time and re-editable per invoice afterward
// (see invoice-details-dialog.tsx), but this page controls the shared
// default every new invoice and every live-generated quote PDF starts from.
export default async function InvoiceSettingsPage() {
  const db = getDb();
  const settings = await getInvoiceTemplateSettings(db);

  let logoUrl: string | null = null;
  if (settings.logoKey) {
    try {
      logoUrl = await resolveLogoUrl(getStorageProvider(), settings.logoKey);
    } catch {
      logoUrl = null;
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Invoice settings</h1>
        <p className="text-sm text-muted-foreground">
          Sets the default logo, accent color, and font for new invoices and quotes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Branding</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceSettingsForm
            logoUrl={logoUrl}
            accentColor={settings.accentColor}
            fontFamily={settings.fontFamily}
          />
        </CardContent>
      </Card>
    </div>
  );
}
