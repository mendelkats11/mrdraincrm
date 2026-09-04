import type { portfolioJobs, reviews, serviceAreas, services } from "@/lib/db/schema";
import type { homepageSections } from "@/lib/db/schema";
import type { WebsiteSettings } from "@/lib/website/settings";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { HeroSection } from "./sections/hero-section";
import { ServicesSection } from "./sections/services-section";
import { WhyMrDrainSection, type WhyMrDrainPointOverride } from "./sections/why-mr-drain-section";
import { ServiceAreasSection } from "./sections/service-areas-section";
import { GallerySection } from "./sections/gallery-section";
import { ReviewsSection } from "./sections/reviews-section";
import { CtaSection } from "./sections/cta-section";

export type HomepageSectionRow = typeof homepageSections.$inferSelect;

/** Shared with both the classic per-section list (website/homepage) and the
 *  visual editor (website/editor) so a section's display name never drifts
 *  between the two. */
export const HOMEPAGE_SECTION_LABELS: Record<string, string> = {
  hero: "Hero (top banner)",
  services: "Services",
  why_mr_drain: "Why Mr. Drain",
  service_areas: "Service Areas",
  gallery: "Gallery",
  reviews: "Reviews",
  cta: "Call to Action (bottom banner)",
};
type Settings = WebsiteSettings;
type Service = typeof services.$inferSelect;
type ServiceArea = typeof serviceAreas.$inferSelect;
type PortfolioJob = typeof portfolioJobs.$inferSelect;
type Review = typeof reviews.$inferSelect;

export function configLimit(config: Record<string, unknown>): number | undefined {
  const limit = config.limit;
  return typeof limit === "number" ? limit : undefined;
}

export function configString(config: Record<string, unknown>, key: string): string | undefined {
  const value = config[key];
  return typeof value === "string" ? value : undefined;
}

export function configPhotoUrls(config: Record<string, unknown>): string[] | undefined {
  const value = config.photoKeys;
  if (!Array.isArray(value)) return undefined;
  const keys = value.filter((k): k is string => typeof k === "string");
  return keys.length > 0 ? keys.map(publicAssetUrl) : undefined;
}

export function configPoints(
  config: Record<string, unknown>,
): WhyMrDrainPointOverride[] | undefined {
  const value = config.points;
  if (!Array.isArray(value)) return undefined;
  return value.map((entry) => {
    const e = entry as Record<string, unknown>;
    return {
      title: typeof e?.title === "string" ? e.title : undefined,
      body: typeof e?.body === "string" ? e.body : undefined,
    };
  });
}

/**
 * The single place that turns one homepage_sections row into its rendered
 * section — shared by the live homepage (src/app/(site)/page.tsx) and the
 * visual editor (src/app/app/(dashboard)/website/editor). Extracted so the
 * two can never drift into "two different representations of the same
 * page," which is exactly the failure mode overhaul.md's editor brief (§13)
 * warns against. Every section component it renders (HeroSection,
 * ServicesSection, etc.) is a plain presentational component with no data
 * fetching of its own, so this works identically in either context.
 */
export function renderHomepageSection(
  section: HomepageSectionRow,
  data: {
    settings: Settings;
    services: Service[];
    serviceAreas: ServiceArea[];
    portfolioJobs: PortfolioJob[];
    reviews: Review[];
  },
) {
  const config = section.config as Record<string, unknown>;
  switch (section.sectionType) {
    case "hero":
      return (
        <HeroSection
          businessName={data.settings.businessName}
          tagline={data.settings.tagline}
          trackingNumber={data.settings.defaultCallrailTrackingNumber}
          photoUrls={configPhotoUrls(config)}
        />
      );
    case "services":
      return <ServicesSection services={data.services} limit={configLimit(config) ?? 6} />;
    case "why_mr_drain":
      return (
        <WhyMrDrainSection
          sectionId={section.id}
          heading={configString(config, "heading")}
          body={configString(config, "body")}
          points={configPoints(config)}
        />
      );
    case "service_areas":
      return (
        <ServiceAreasSection serviceAreas={data.serviceAreas} limit={configLimit(config) ?? 6} />
      );
    case "gallery":
      return <GallerySection jobs={data.portfolioJobs} limit={configLimit(config) ?? 8} />;
    case "reviews":
      return <ReviewsSection reviews={data.reviews} limit={configLimit(config) ?? 6} />;
    case "cta":
      return (
        <CtaSection
          sectionId={section.id}
          heading={configString(config, "heading")}
          body={configString(config, "body")}
          trackingNumber={data.settings.defaultCallrailTrackingNumber}
        />
      );
    default:
      return null;
  }
}
