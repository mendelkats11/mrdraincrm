import type { MetadataRoute } from "next";
import { getPublicSiteOrigin } from "@/lib/site-url";

/**
 * SEO audit (Sep 2026) P0 finding: mrdrainsk.com/robots.txt 404'd on
 * production. The public marketing site has nothing that needs disallowing
 * — the private app (app.<host>) is a separate host entirely, kept out of
 * search results via an X-Robots-Tag: noindex header in src/proxy.ts
 * instead of a robots rule here, since a crawler that never fetches this
 * file at all (or gets a 404 for it on that host) can't be relied on to
 * respect a Disallow anyway.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = getPublicSiteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
