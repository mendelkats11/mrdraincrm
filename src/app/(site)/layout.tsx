import { getDb } from "@/lib/db/client";
import { getWebsiteSettings } from "@/lib/website/settings";
import { listPublishedServiceAreas } from "@/lib/website/service-areas";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { localBusinessSchema } from "@/lib/seo/local-business-schema";

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

  const schema = localBusinessSchema({
    businessName: settings.businessName,
    businessAddress: settings.businessAddress,
    telephone: settings.defaultCallrailTrackingNumber,
    // "Saskatoon" first — every service area on the site is either a
    // Saskatoon neighbourhood or an immediately adjacent town, but none of
    // them is literally named "Saskatoon," and that's the term with by far
    // the most search demand (see the Sep 2026 SEO audit's keyword
    // universe, §4).
    areaServed: ["Saskatoon", ...serviceAreas.map((area) => area.name)],
  });

  return (
    <div className="site-theme flex min-h-screen flex-col bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
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
