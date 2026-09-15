import type { Metadata } from "next";
import { getDb } from "@/lib/db/client";
import { getWebsiteSettings } from "@/lib/website/settings";
import { listActiveHomepageSections } from "@/lib/website/homepage";
import { listPublishedServices } from "@/lib/website/services";
import { listPublishedServiceAreas } from "@/lib/website/service-areas";
import { listPublishedPortfolioJobs } from "@/lib/website/portfolio-jobs";
import { listPublishedReviews } from "@/lib/website/reviews";
import { renderHomepageSection } from "@/components/site/homepage-section-renderer";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";

export const dynamic = "force-dynamic";

// SEO audit (Sep 2026) P0 finding: the homepage had no metadata of its own
// and was falling back to the root layout's generic
// "Mr. Drain" / "Mr. Drain plumbing — public website and business
// platform." — the exact text Google would show in a search snippet for
// the single most important page on the domain.
export const metadata: Metadata = {
  // Was 65 characters with the old wording — Google truncates page titles
  // past roughly 60, so the tail end ("...ain Plumbing") was getting cut
  // off in search results (Sep 2026 SEO audit).
  title: "24/7 Saskatoon Plumber | Mr. Drain Plumbing",
  description:
    "Fast, reliable plumbing and drain services in Saskatoon, SK and area - Rosewood, Stonebridge, Martensville, Warman, and more. Call 24/7 or request a free quote.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Saskatoon Plumber | Mr. Drain Plumbing",
    description:
      "Fast, reliable plumbing and drain services in Saskatoon, SK and area. Call 24/7 or request a free quote.",
    url: "/",
    siteName: "Mr. Drain Plumbing",
    locale: "en_CA",
    type: "website",
    images: [{ url: "/logo.png", width: 1024, height: 754 }],
  },
};

export default async function HomePage() {
  const db = getDb();
  const [settings, sections, services, serviceAreas, portfolioJobs, reviews] = await Promise.all([
    getWebsiteSettings(db),
    listActiveHomepageSections(db),
    listPublishedServices(db),
    listPublishedServiceAreas(db),
    listPublishedPortfolioJobs(db),
    listPublishedReviews(db),
  ]);
  const data = { settings, services, serviceAreas, portfolioJobs, reviews };

  return (
    <>
      {sections.map((section) => (
        <div key={section.id}>{renderHomepageSection(section, data)}</div>
      ))}
      <MobileFloatingCta trackingNumber={settings.defaultCallrailTrackingNumber} />
    </>
  );
}
