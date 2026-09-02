import { getPublicSiteOrigin } from "@/lib/site-url";

export interface BreadcrumbCrumb {
  name: string;
  /** Relative path, e.g. "/services" or "/services/drain-cleaning". */
  path: string;
}

/**
 * A BreadcrumbList JSON-LD object for the given crumbs — render via
 * `<script type="application/ld+json">` on service and service-area detail
 * pages. SEO audit (Sep 2026) P1 finding: no structured data existed
 * anywhere on the site.
 */
export function breadcrumbSchema(crumbs: BreadcrumbCrumb[]) {
  const origin = getPublicSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${origin}${crumb.path}`,
    })),
  };
}
