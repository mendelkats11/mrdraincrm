const MAX_TITLE_LENGTH = 60;
const BRAND_SUFFIX = " | Mr. Drain Plumbing";

/**
 * Appends the brand suffix only if the result stays within Google's
 * effective SERP title budget (~50-60 characters, per the Sep 2026 SEO
 * audit). Longer service names ("Garbage Disposal Installation") combined
 * with an area suffix ("in Brighton, Saskatoon") regularly pushed titles
 * past 60 characters once " | Mr. Drain Plumbing" was appended too —
 * Google truncates mid-word past that point, which reads worse than
 * dropping the brand tag and keeping the actual topic intact. The site
 * name still shows up separately in most SERP layouts regardless.
 */
export function pageTitle(primary: string): string {
  const withBrand = `${primary}${BRAND_SUFFIX}`;
  return withBrand.length <= MAX_TITLE_LENGTH ? withBrand : primary;
}
