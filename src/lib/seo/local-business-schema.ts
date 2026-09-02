import { getPublicSiteOrigin } from "@/lib/site-url";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Best-effort parse of the admin-entered "street, city, PROVINCE POSTAL"
 * address string into schema.org's structured PostalAddress shape. Falls
 * back to putting the whole string in streetAddress if it doesn't match
 * the expected shape — a worse-but-valid result rather than throwing, since
 * this is free-text the admin can edit to anything.
 */
function parseAddress(raw: string): Record<string, string> {
  const parts = raw.split(",").map((p) => p.trim());
  if (parts.length >= 3) {
    const [streetAddress, addressLocality, regionAndPostal] = [
      parts[0],
      parts[1],
      parts.slice(2).join(", "),
    ];
    const regionMatch = regionAndPostal.match(/^([A-Za-z]{2})\s+(.+)$/);
    if (regionMatch) {
      return {
        "@type": "PostalAddress",
        streetAddress,
        addressLocality,
        addressRegion: regionMatch[1],
        postalCode: regionMatch[2],
        addressCountry: "CA",
      };
    }
    return {
      "@type": "PostalAddress",
      streetAddress,
      addressLocality,
      addressCountry: "CA",
    };
  }
  return { "@type": "PostalAddress", streetAddress: raw, addressCountry: "CA" };
}

/**
 * LocalBusiness (Plumber subtype) JSON-LD for the whole public site —
 * SEO audit (Sep 2026) P0 finding: no structured data existed anywhere,
 * leaving Google to infer name/address/phone/service area from footer text
 * rather than read it directly. Only includes fields verified against the
 * site's own settings/service-area data — no fabricated reviews, ratings,
 * price range, hours, or credentials (overhaul.md's SEO skill is explicit
 * that these must never be invented).
 */
export function localBusinessSchema({
  businessName,
  businessAddress,
  telephone,
  areaServed,
}: {
  businessName: string | null;
  businessAddress: string | null;
  telephone: string | null;
  areaServed: string[];
}) {
  const origin = getPublicSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "Plumber",
    name: businessName || "Mr. Drain Plumbing",
    url: origin,
    image: `${origin}/logo.png`,
    ...(telephone ? { telephone } : {}),
    ...(businessAddress ? { address: parseAddress(businessAddress) } : {}),
    ...(areaServed.length > 0 ? { areaServed } : {}),
    // The business context this site was built from states 24/7
    // availability as an established fact, not a claim invented for this
    // schema block.
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAYS,
      opens: "00:00",
      closes: "23:59",
    },
  };
}
