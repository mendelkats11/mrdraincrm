import { getDb } from "@/lib/db/client";
import { listPublishedServices } from "@/lib/website/services";
import { listPublishedServiceAreas } from "@/lib/website/service-areas";
import { getWebsiteSettings } from "@/lib/website/settings";
import { getPublicSiteOrigin } from "@/lib/site-url";

// Generated from live data (same convention as sitemap.ts/robots.ts) so it
// can never drift from what services/areas actually exist — a static file
// here would silently go stale the next time a service or area is added
// or retired through the admin CMS.
//
// llms.txt (see llmstxt.org) isn't a Google/robots-style crawl directive —
// it's an emerging, informal convention for giving AI systems a concise,
// curated map of a site's real content instead of making them infer it
// from a full crawl. No official Next.js route convention exists for it
// (unlike sitemap.xml/robots.txt), so this is a plain Route Handler at the
// literal path /llms.txt.
export const revalidate = 3600;

export async function GET() {
  const db = getDb();
  const origin = getPublicSiteOrigin();
  const [settings, services, areas] = await Promise.all([
    getWebsiteSettings(db),
    listPublishedServices(db),
    listPublishedServiceAreas(db),
  ]);

  const businessName = settings.businessName || "Mr. Drain Plumbing";
  const lines = [
    `# ${businessName}`,
    "",
    `> Locally owned residential plumbing company serving Saskatoon, Saskatchewan and the surrounding area. ${
      settings.defaultCallrailTrackingNumber
        ? `Call: ${settings.defaultCallrailTrackingNumber}. `
        : ""
    }Website: ${origin}`,
    "",
    "## Services",
    ...services.map((s) => `- [${s.name}](${origin}/services/${s.slug})`),
    "",
    "## Service Areas",
    ...areas.map((a) => `- [${a.name}](${origin}/service-areas/${a.slug})`),
    "",
    "## Other pages",
    `- [About](${origin}/about)`,
    `- [Contact / Get a Free Quote](${origin}/contact)`,
    `- [Gallery of completed work](${origin}/gallery)`,
  ];

  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
