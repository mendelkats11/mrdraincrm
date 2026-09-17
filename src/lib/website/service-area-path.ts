// Matches /service-areas/{slug} and /service-areas/{slug}/{service} (never
// the bare /service-areas listing, which has no slug segment to capture).
// Shared between src/proxy.ts (server-side matcher, no longer used for the
// footer - see site-footer.tsx) and SiteFooter (client-side, resolves the
// current area from the pathname directly via usePathname() so the footer
// updates correctly on client-side navigation between service-area pages,
// which a shared layout reading a request header cannot do - Next.js reuses
// the parent layout's already-rendered output on sibling navigations
// instead of re-running it).
const SERVICE_AREA_PATH_PATTERN = /^\/service-areas\/([^/]+)(?:\/[^/]+)?\/?$/;

export function serviceAreaSlugFromPath(pathname: string): string | null {
  return SERVICE_AREA_PATH_PATTERN.exec(pathname)?.[1] ?? null;
}
