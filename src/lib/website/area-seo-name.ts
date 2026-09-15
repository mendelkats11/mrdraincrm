// Brighton, Rosewood, Stonebridge, and College Park are Saskatoon
// neighbourhoods, not their own cities — "Brighton" alone is ambiguous
// (there are Brightons all over) and doesn't tell Google what it's a
// neighbourhood *of*. Warman and Martensville are their own separate
// towns near Saskatoon, so pairing them with "Saskatoon" the same way
// would be geographically wrong, not just unnecessary. Hardcoded rather
// than a new admin-editable field — this is a fixed geographic fact
// about these six areas, not content anyone needs to edit.
const SASKATOON_NEIGHBOURHOOD_SLUGS = new Set([
  "brighton",
  "rosewood",
  "stonebridge",
  "college-park",
]);

/**
 * The area name as it should appear in page titles, headings, and meta
 * descriptions — "Brighton, Saskatoon" for the four in-city
 * neighbourhoods, just "Warman" / "Martensville" for the two separate
 * towns. Not used for short UI labels (nav dropdown, homepage area
 * cards) — only where the area is being named for search/SEO purposes.
 */
export function areaSeoName(area: { slug: string; name: string }): string {
  return SASKATOON_NEIGHBOURHOOD_SLUGS.has(area.slug) ? `${area.name}, Saskatoon` : area.name;
}
