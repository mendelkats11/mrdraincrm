// Long-tail local-SEO keyword banks for auto-generating a job's title the
// moment its cover photo is added — the point is exactly this Service +
// Location + Intent phrasing (matching how people actually search), not
// every real service name verbatim, so this is a deliberately separate,
// hand-curated list rather than pulled from the live services/service-areas
// tables. Extend these arrays directly to add more variety; nothing else
// needs to change.
export const JOB_TITLE_SERVICES = [
  "Plumber",
  "Plumbing",
  "Drain Cleaning",
  "Hydro Jetting",
  "Toilet Repair",
  "Water Heater",
] as const;

export const JOB_TITLE_LOCATIONS = [
  "Saskatoon",
  "Brighton",
  "Rosewood",
  "Stonebridge",
  "College Park",
] as const;

// Each template already bakes in one "intent" (near me / 24 hour /
// emergency / repair / service / company / cost) rather than tacking the
// intent word on separately — picking service+location+intent as three
// independent random words produces awkward/redundant combinations (e.g.
// "Toilet Repair Repair"); picking a whole template instead keeps every
// result reading like a real phrase.
const JOB_TITLE_TEMPLATES = [
  "{service} in {location}",
  "{service} Near Me in {location}",
  "24 Hour {service} in {location}",
  "Emergency {service} in {location}",
  "{service} Repair in {location}",
  "{service} Service in {location}",
  "{service} Company in {location}",
  "{service} Cost in {location}",
] as const;

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Builds one Service + Location + Intent title, e.g. "Emergency Hydro
 * Jetting in Rosewood" — the default title a new job gets so there's never
 * a blank "Completed job" placeholder to fill in later. Still fully
 * renameable afterward via the visual editor's click-to-edit title.
 */
export function generateJobTitle(): string {
  const service = randomItem(JOB_TITLE_SERVICES);
  const location = randomItem(JOB_TITLE_LOCATIONS);
  const template = randomItem(JOB_TITLE_TEMPLATES);
  return template.replace("{service}", service).replace("{location}", location);
}
