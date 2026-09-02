import type { MetadataRoute } from "next";
import { getDb } from "@/lib/db/client";
import { listPublishedServices } from "@/lib/website/services";
import { listPublishedServiceAreas } from "@/lib/website/service-areas";
import { getWebsiteSettings } from "@/lib/website/settings";
import { getPublicSiteOrigin } from "@/lib/site-url";

// Regenerate at most hourly — services/service-areas/reviews toggle on and
// off via the admin CMS, and this keeps the sitemap from silently drifting
// stale for long after a change without hitting the DB on every crawl.
export const revalidate = 3600;

/**
 * The public site's sitemap — SEO audit (Sep 2026) P0 finding: mrdrainsk.com
 * had no sitemap.xml at all (confirmed 404 on production), leaving Google
 * with no authoritative URL list. Lives at the app root (not under
 * src/app/(site)/) because Next's sitemap.ts file convention binds to the
 * literal /sitemap.xml path regardless of route groups; src/proxy.ts passes
 * this straight through unmodified for the public host, and app.<host>
 * requests never reach it (proxy rewrites them to /app/sitemap.xml first,
 * which doesn't exist — fine, since the app host getting an X-Robots-Tag
 * noindex header, see proxy.ts, is what actually needs to keep it out of
 * search results).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getDb();
  const origin = getPublicSiteOrigin();
  const [services, areas, settings] = await Promise.all([
    listPublishedServices(db),
    listPublishedServiceAreas(db),
    getWebsiteSettings(db),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${origin}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/services`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${origin}/service-areas`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${origin}/contact`, changeFrequency: "yearly", priority: 0.7 },
    { url: `${origin}/about`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${origin}/gallery`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${origin}/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${origin}/privacy`, changeFrequency: "yearly", priority: 0.1 },
  ];

  // Only listed when the admin has actually turned the page on — a
  // sitemap entry for a page that 404s is its own small crawl problem.
  if (settings.reviewsPageEnabled) {
    staticPages.push({ url: `${origin}/reviews`, changeFrequency: "weekly", priority: 0.6 });
  }

  const servicePages: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${origin}/services/${service.slug}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const areaPages: MetadataRoute.Sitemap = areas.map((area) => ({
    url: `${origin}/service-areas/${area.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...servicePages, ...areaPages];
}
