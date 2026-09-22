import { services, serviceAreas, siteSettings } from "@/lib/website/site-data";
import { getPublicSiteOrigin } from "@/lib/site-url";

// llms.txt (see llmstxt.org) isn't a Google/robots-style crawl directive —
// it's an emerging, informal convention for giving AI systems a concise,
// curated map of a site's real content instead of making them infer it
// from a full crawl. No official Next.js route convention exists for it
// (unlike sitemap.xml/robots.txt), so this is a plain Route Handler at the
// literal path /llms.txt. Generated from the same static site-data module
// as everything else, so it can never drift from what services/areas
// actually exist on the site.

// Content is fixed at build time (no live database) - render this once as
// static output instead of recomputing it on every request.
export const dynamic = "force-static";

export async function GET() {
  const origin = getPublicSiteOrigin();
  const businessName = siteSettings.businessName;
  const lines = [
    `# ${businessName}`,
    "",
    `> Locally owned residential plumbing company serving Saskatoon, Saskatchewan and the surrounding area. Call: ${siteSettings.defaultCallrailTrackingNumber}. Website: ${origin}`,
    "",
    "## Services",
    ...services.map((s) => `- [${s.name}](${origin}/services/${s.slug})`),
    "",
    "## Service Areas",
    ...serviceAreas.map((a) => `- [${a.name}](${origin}/service-areas/${a.slug})`),
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
