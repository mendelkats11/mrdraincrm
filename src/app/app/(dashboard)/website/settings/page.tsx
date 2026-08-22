import { getDb } from "@/lib/db/client";
import { getWebsiteSettings } from "@/lib/website/settings";
import { getPublicSiteOrigin } from "@/lib/site-url";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SitePreviewPane } from "@/components/site-preview-pane";
import { WebsiteSettingsForm } from "./website-settings-form";

export default async function WebsiteSettingsPage() {
  const db = getDb();
  const settings = await getWebsiteSettings(db);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Branding &amp; Contact</h1>
          <p className="text-sm text-muted-foreground">
            Business info, tagline, About page content, and the default Call Now number shown on
            pages without a more specific service-area number.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Site content</CardTitle>
          </CardHeader>
          <CardContent>
            <WebsiteSettingsForm settings={settings} />
          </CardContent>
        </Card>
      </div>

      <SitePreviewPane origin={getPublicSiteOrigin()} path="/about" />
    </div>
  );
}
