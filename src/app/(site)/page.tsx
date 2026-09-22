import type { Metadata } from "next";
import { siteSettings, services, serviceAreas, portfolioJobs } from "@/lib/website/site-data";
import { HeroSection } from "@/components/site/sections/hero-section";
import { ServicesSection } from "@/components/site/sections/services-section";
import { WhyMrDrainSection } from "@/components/site/sections/why-mr-drain-section";
import { ServiceAreasSection } from "@/components/site/sections/service-areas-section";
import { GallerySection } from "@/components/site/sections/gallery-section";
import { CtaSection } from "@/components/site/sections/cta-section";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";

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

export default function HomePage() {
  // Real job photos for the hero collage - same three used on /gallery's
  // "Our Work" section, picked for visual variety.
  const heroPhotos = portfolioJobs.map((job) => publicAssetUrl(job.coverImageKey));

  return (
    <>
      <HeroSection
        businessName={siteSettings.businessName}
        tagline={siteSettings.tagline}
        trackingNumber={siteSettings.defaultCallrailTrackingNumber}
        photoUrls={heroPhotos}
      />
      <ServicesSection services={services} limit={6} />
      <WhyMrDrainSection />
      <ServiceAreasSection serviceAreas={serviceAreas} limit={6} />
      <GallerySection jobs={portfolioJobs} limit={8} />
      <CtaSection trackingNumber={siteSettings.defaultCallrailTrackingNumber} />
      <MobileFloatingCta trackingNumber={siteSettings.defaultCallrailTrackingNumber} />
    </>
  );
}
