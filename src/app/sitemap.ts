import type { MetadataRoute } from "next";
import { services, serviceAreas, portfolioJobs, siteSettings } from "@/lib/website/site-data";
import { getPublicSiteOrigin } from "@/lib/site-url";

/**
 * The public site's sitemap — SEO audit (Sep 2026) P0 finding: mrdrainsk.com
 * had no sitemap.xml at all (confirmed 404 on production), leaving Google
 * with no authoritative URL list. Lives at the app root (not under
 * src/app/(site)/) because Next's sitemap.ts file convention binds to the
 * literal /sitemap.xml path regardless of route groups; src/proxy.ts passes
 * this straight through unmodified for the public host, and app.<host>
 * requests never reach it.
 *
 * lastModified is a fixed build-time constant, not per-request "now" — a
 * second SEO audit (Sep 2026) P2 finding was that this sitemap had no
 * lastmod at all; content is now static in code, so "last modified" is
 * genuinely "the last time this file was edited," which this constant
 * should be bumped to whenever real content changes.
 */
const CONTENT_LAST_UPDATED = new Date("2026-09-22");

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getPublicSiteOrigin();
  const lastModified = CONTENT_LAST_UPDATED;

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${origin}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${origin}/services`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${origin}/service-areas`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${origin}/contact`, lastModified, changeFrequency: "yearly", priority: 0.7 },
    { url: `${origin}/about`, lastModified, changeFrequency: "yearly", priority: 0.5 },
    { url: `${origin}/gallery`, lastModified, changeFrequency: "yearly", priority: 0.4 },
    { url: `${origin}/terms`, lastModified, changeFrequency: "yearly", priority: 0.1 },
    { url: `${origin}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.1 },
  ];

  // Only listed when the page is actually turned on — a sitemap entry for
  // a page that 404s is its own small crawl problem.
  if (siteSettings.reviewsPageEnabled) {
    staticPages.push({
      url: `${origin}/reviews`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.6,
    });
  }

  const servicePages: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${origin}/services/${service.slug}`,
    lastModified,
    changeFrequency: "yearly",
    priority: 0.8,
  }));

  const areaPages: MetadataRoute.Sitemap = serviceAreas.map((area) => ({
    url: `${origin}/service-areas/${area.slug}`,
    lastModified,
    changeFrequency: "yearly",
    priority: 0.7,
  }));

  const jobPages: MetadataRoute.Sitemap = portfolioJobs.map((job) => ({
    url: `${origin}/gallery/${job.slug}`,
    lastModified,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  // Every service × area combination — each is a real, independently
  // rankable "{service} in {area}" page (src/app/(site)/service-areas/
  // [slug]/[service]/page.tsx), not a duplicate of /services/{slug}.
  const areaServicePages: MetadataRoute.Sitemap = serviceAreas.flatMap((area) =>
    services.map((service) => ({
      url: `${origin}/service-areas/${area.slug}/${service.slug}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  );

  return [...staticPages, ...servicePages, ...areaPages, ...areaServicePages, ...jobPages];
}
