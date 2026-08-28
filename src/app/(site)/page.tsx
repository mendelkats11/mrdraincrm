import { getDb } from "@/lib/db/client";
import { getWebsiteSettings } from "@/lib/website/settings";
import { listActiveHomepageSections } from "@/lib/website/homepage";
import { listPublishedServices } from "@/lib/website/services";
import { listPublishedServiceAreas } from "@/lib/website/service-areas";
import { listPublishedGalleryItems } from "@/lib/website/gallery";
import { listPublishedReviews } from "@/lib/website/reviews";
import { HeroSection } from "@/components/site/sections/hero-section";
import { ServicesSection } from "@/components/site/sections/services-section";
import {
  WhyMrDrainSection,
  type WhyMrDrainPointOverride,
} from "@/components/site/sections/why-mr-drain-section";
import { ServiceAreasSection } from "@/components/site/sections/service-areas-section";
import { GallerySection } from "@/components/site/sections/gallery-section";
import { ReviewsSection } from "@/components/site/sections/reviews-section";
import { CtaSection } from "@/components/site/sections/cta-section";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";

export const dynamic = "force-dynamic";

function configLimit(config: Record<string, unknown>): number | undefined {
  const limit = config.limit;
  return typeof limit === "number" ? limit : undefined;
}

function configString(config: Record<string, unknown>, key: string): string | undefined {
  const value = config[key];
  return typeof value === "string" ? value : undefined;
}

function configPoints(config: Record<string, unknown>): WhyMrDrainPointOverride[] | undefined {
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

export default async function HomePage() {
  const db = getDb();
  const [settings, sections, services, serviceAreas, galleryItems, reviews] = await Promise.all([
    getWebsiteSettings(db),
    listActiveHomepageSections(db),
    listPublishedServices(db),
    listPublishedServiceAreas(db),
    listPublishedGalleryItems(db),
    listPublishedReviews(db),
  ]);

  return (
    <>
      {sections.map((section) => {
        switch (section.sectionType) {
          case "hero":
            return (
              <HeroSection
                key={section.id}
                businessName={settings.businessName}
                tagline={settings.tagline}
                trackingNumber={settings.defaultCallrailTrackingNumber}
              />
            );
          case "services":
            return (
              <ServicesSection
                key={section.id}
                services={services}
                limit={configLimit(section.config) ?? 6}
              />
            );
          case "why_mr_drain":
            return (
              <WhyMrDrainSection
                key={section.id}
                heading={configString(section.config, "heading")}
                body={configString(section.config, "body")}
                points={configPoints(section.config)}
              />
            );
          case "service_areas":
            return (
              <ServiceAreasSection
                key={section.id}
                serviceAreas={serviceAreas}
                limit={configLimit(section.config) ?? 6}
              />
            );
          case "gallery":
            return (
              <GallerySection
                key={section.id}
                items={galleryItems}
                limit={configLimit(section.config) ?? 8}
              />
            );
          case "reviews":
            return (
              <ReviewsSection
                key={section.id}
                reviews={reviews}
                limit={configLimit(section.config) ?? 6}
              />
            );
          case "cta":
            return (
              <CtaSection
                key={section.id}
                heading={configString(section.config, "heading")}
                body={configString(section.config, "body")}
                trackingNumber={settings.defaultCallrailTrackingNumber}
              />
            );
          default:
            return null;
        }
      })}
      <MobileFloatingCta trackingNumber={settings.defaultCallrailTrackingNumber} />
    </>
  );
}
