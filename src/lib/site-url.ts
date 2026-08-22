const DEFAULT_APP_URL = "http://app.localhost:3000";

/**
 * The public marketing site's origin, derived from APP_URL rather than a
 * separate env var — the two hostnames are always "app." + everything else
 * (src/proxy.ts's isAppHost), so there's nothing to configure independently
 * without risking the two drifting apart. Server-only: reads process.env,
 * so callers that need this in a client component must resolve it in a
 * server component/action and pass the string down as a prop.
 */
export function getPublicSiteOrigin(): string {
  const appUrl = process.env.APP_URL || DEFAULT_APP_URL;
  const url = new URL(appUrl);
  url.hostname = url.hostname.replace(/^app\./, "");
  return url.origin;
}
