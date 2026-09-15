import type { Metadata } from "next";
import { headers } from "next/headers";
import { getDb } from "@/lib/db/client";
import { getWebsiteSettings } from "@/lib/website/settings";
import { listPublishedServiceAreas, getServiceAreaBySlug } from "@/lib/website/service-areas";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { localBusinessSchema } from "@/lib/seo/local-business-schema";

// Public marketing site shell — header/footer/theme for every page under
// src/app/(site)/*. Reads live settings (business name, tagline source,
// default Call Now number), so this must stay dynamic — see the identical
// reasoning already established on the pre-Phase-15 contact page.
export const dynamic = "force-dynamic";

// A layout-level Open Graph image default — SEO audit (Sep 2026) finding:
// most pages had no og:image at all, so a link shared to Slack/iMessage/
// Facebook showed no preview thumbnail. Any page that declares its own
// `openGraph` (the homepage, gallery job pages with a real photo) fully
// replaces this rather than merging with it — that's how Next resolves
// metadata per segment — so this is specifically the fallback for every
// page that doesn't set one of its own.
export const metadata: Metadata = {
  openGraph: {
    images: [{ url: "/logo.png", width: 1024, height: 754 }],
  },
};

function getAppUrl(): string {
  return process.env.APP_URL || "http://app.localhost:3000";
}

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const db = getDb();
  const [settings, serviceAreas] = await Promise.all([
    getWebsiteSettings(db),
    listPublishedServiceAreas(db),
  ]);

  // A layout only gets params for its own route segment, and this one
  // wraps every page in the site — it has no direct way to know it's
  // rendering /service-areas/brighton or one of brighton's per-service
  // pages. src/proxy.ts sets this header from the request path so the
  // footer below can show that area's own address/phone instead of the
  // site-wide default, per docs — a visitor on a Brighton page should see
  // Brighton's number, not just get routed to it after calling.
  const areaSlug = (await headers()).get("x-service-area-slug");
  const currentArea = areaSlug ? await getServiceAreaBySlug(db, areaSlug) : null;
  const footerBusinessAddress = currentArea?.businessAddress || settings.businessAddress;
  const footerTrackingNumber =
    currentArea?.callrailTrackingNumber || settings.defaultCallrailTrackingNumber;

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
        businessAddress={footerBusinessAddress}
        contactEmail={settings.publicContactEmail}
        trackingNumber={footerTrackingNumber}
        footerTagline={settings.footerTagline}
        reviewsEnabled={settings.reviewsPageEnabled}
        appUrl={getAppUrl()}
      />
    </div>
  );
}
