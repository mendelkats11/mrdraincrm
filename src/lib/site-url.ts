const DEFAULT_APP_URL = "http://app.localhost:3000";

/**
 * The public site's origin, derived from the APP_URL env var (kept under its
 * original name so the existing Hostinger configuration keeps working). A
 * leading "app." host label - left over from the retired private app's
 * subdomain - is stripped. Server-only: reads process.env.
 */
export function getPublicSiteOrigin(): string {
  const appUrl = process.env.APP_URL || DEFAULT_APP_URL;
  const url = new URL(appUrl);
  url.hostname = url.hostname.replace(/^app\./, "");
  return url.origin;
}
