import { getDb } from "@/lib/db/client";
import { getWebsiteSettings } from "@/lib/website/settings";
import { listPublishedServiceAreas } from "@/lib/website/service-areas";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

// Public marketing site shell — header/footer/theme for every page under
// src/app/(site)/*. Reads live settings (business name, tagline source,
// default Call Now number), so this must stay dynamic — see the identical
// reasoning already established on the pre-Phase-15 contact page.
export const dynamic = "force-dynamic";

function getAppUrl(): string {
  return process.env.APP_URL || "http://app.localhost:3000";
}

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const db = getDb();
  const [settings, serviceAreas] = await Promise.all([
    getWebsiteSettings(db),
    listPublishedServiceAreas(db),
  ]);

  return (
    <div className="site-theme flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader
        trackingNumber={settings.defaultCallrailTrackingNumber}
        serviceAreas={serviceAreas.map((area) => ({ slug: area.slug, name: area.name }))}
        reviewsEnabled={settings.reviewsPageEnabled}
      />
      <main className="flex-1 pb-20 sm:pb-0">{children}</main>
      <SiteFooter
        businessName={settings.businessName}
        businessAddress={settings.businessAddress}
        contactEmail={settings.publicContactEmail}
        trackingNumber={settings.defaultCallrailTrackingNumber}
        footerTagline={settings.footerTagline}
        reviewsEnabled={settings.reviewsPageEnabled}
        appUrl={getAppUrl()}
      />
    </div>
  );
}
