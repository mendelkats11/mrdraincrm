import type { Metadata } from "next";
import { siteSettings, serviceAreas } from "@/lib/website/site-data";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { localBusinessSchema } from "@/lib/seo/local-business-schema";

// Public marketing site shell — header/footer/theme for every page under
// src/app/(site)/*. Content is static (see src/lib/website/site-data.ts),
// so this no longer needs to stay dynamic for a live settings fetch — kept
// as a plain server component regardless, since nothing here is
// user-specific.

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

export default function SiteLayout({ children }: LayoutProps<"/">) {
  const schema = localBusinessSchema({
    businessName: siteSettings.businessName,
    businessAddress: siteSettings.businessAddress,
    telephone: siteSettings.defaultCallrailTrackingNumber,
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
        trackingNumber={siteSettings.defaultCallrailTrackingNumber}
        serviceAreas={serviceAreas.map((area) => ({ slug: area.slug, name: area.name }))}
        reviewsEnabled={siteSettings.reviewsPageEnabled}
      />
      <main className="flex-1 pb-20 sm:pb-0">{children}</main>
      <SiteFooter
        businessName={siteSettings.businessName}
        businessAddress={siteSettings.businessAddress}
        contactEmail={siteSettings.publicContactEmail}
        trackingNumber={siteSettings.defaultCallrailTrackingNumber}
        footerTagline={siteSettings.footerTagline}
        reviewsEnabled={siteSettings.reviewsPageEnabled}
        serviceAreas={serviceAreas.map((area) => ({
          slug: area.slug,
          businessAddress: area.businessAddress,
          callrailTrackingNumber: area.callrailTrackingNumber,
        }))}
      />
    </div>
  );
}
