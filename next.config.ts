import type { NextConfig } from "next";

// Phase 18 (production hardening) — this app has no legitimate use for
// being framed, running third-party scripts, or reading device APIs
// (camera/mic/geolocation/etc), so the policy below is deny-by-default with
// narrow, deliberate exceptions:
//   - script-src/style-src 'unsafe-inline': confirmed empirically (not
//     assumed) — Next.js 16's App Router injects its own inline hydration
//     bootstrap scripts on every page, and 'script-src self' alone breaks
//     hydration entirely (verified against the real dev server: React threw
//     "Invariant: Expected a request ID to be defined" and the app failed
//     to hydrate). A real nonce-based CSP is Next.js's documented fix for
//     this, but it requires generating a per-request nonce in src/proxy.ts
//     and threading it through next.config's headers() as well — a bigger,
//     riskier change than this hardening pass warrants given this app has
//     zero dangerouslySetInnerHTML usage anywhere (grepped repo-wide) and
//     React's default JSX escaping already blocks the realistic injection
//     vector (the public lead-submission form's free-text fields rendered
//     back to the owner). Documented here as a good follow-up, not silently
//     dropped. Inline *styles* (Radix/Tailwind positioning) have the same
//     practical necessity and much lower risk than inline *script*.
//   - img-src https://*.r2.cloudflarestorage.com: job photos and the
//     invoice logo are served via short-lived signed R2 URLs
//     (src/lib/storage/r2-provider.ts), not same-origin.
//   - frame-src blob:: the invoice PDF preview (@react-pdf/renderer's
//     PDFViewer, src/components/invoice-pdf-preview.tsx) renders into an
//     <iframe src="blob:..."> generated client-side.
// React's dev-mode-only debugging helpers use eval() (confirmed via the
// dev server's own console warning, which explicitly states "React will
// never use eval() in production mode") — 'unsafe-eval' is scoped to
// non-production so the deployed policy stays stricter than local dev.
//
// frame-ancestors is the one directive that differs by host (see below,
// applied via two separate headers() entries): the private app
// (app.mrdrainsk.com, rewritten internally to /app/* by src/proxy.ts) must
// never be frameable by anyone, full stop. The public marketing site is
// allowed to be framed, but ONLY by the app's own origin — that's what
// powers the Website CMS's live preview pane (src/components/
// site-preview-pane.tsx), which embeds the real public pages in an iframe
// so an edit's effect is visible without leaving the admin screen. No
// third-party site can frame either host either way.
function buildCsp(frameAncestors: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.r2.cloudflarestorage.com",
    "font-src 'self' data:",
    // data: is required here (not just in img-src) because @react-pdf/
    // renderer's PDFViewer loads its yoga-layout WASM module via
    // fetch("data:application/octet-stream;base64,...") — confirmed by
    // reproducing the exact CSP violation against the real invoice detail
    // page before adding this.
    "connect-src 'self' data:",
    "frame-src blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
  ].join("; ");
}

const APP_ORIGIN = new URL(process.env.APP_URL || "http://app.localhost:3000").origin;

function buildSecurityHeaders(frameAncestors: string, frameOptions: string | null) {
  const headers: { key: string; value: string }[] = [
    { key: "Content-Security-Policy", value: buildCsp(frameAncestors) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
  ];
  // X-Frame-Options has no equivalent of CSP's multi-origin allow-list (its
  // only values are DENY/SAMEORIGIN/ALLOW-FROM, the last of which is
  // obsolete/unsupported by modern browsers) — set only where the answer is
  // a flat DENY. Where framing is allowed at all, frame-ancestors above is
  // the enforcing directive; all modern browsers prefer CSP frame-ancestors
  // over X-Frame-Options when both are present anyway.
  if (frameOptions) headers.push({ key: "X-Frame-Options", value: frameOptions });

  // HSTS is only meaningful (and only honored by browsers) over a real
  // HTTPS connection — sending it in local http:// dev is a no-op, but
  // gating it keeps the distinction explicit rather than relying on
  // browsers to ignore it, matching how the session cookie's `secure` flag
  // is already gated (src/lib/auth/actions.ts).
  if (process.env.NODE_ENV === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }
  return headers;
}

const APP_SECURITY_HEADERS = buildSecurityHeaders("'none'", "DENY");
const PUBLIC_SECURITY_HEADERS = buildSecurityHeaders(`'self' ${APP_ORIGIN}`, null);

// Matching must be host-based, not path-based: src/proxy.ts's rewrite of
// app-host requests to /app/* happens in middleware, which runs BEFORE
// next.config's headers() source matching sees the request — headers()
// only ever sees the original incoming pathname (confirmed empirically: a
// request to http://app.localhost:3000/login carries
// `x-middleware-rewrite: /app/login` but headers() `source: "/app/:path*"`
// never matched it). The app subdomain is always literally "app." + the
// public hostname (src/proxy.ts's isAppHost) in every environment, so a
// simple prefix regex on the Host header reliably tells the two apart.
const APP_HOSTNAME_PATTERN = "^app\\..*";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: APP_HOSTNAME_PATTERN }],
        headers: APP_SECURITY_HEADERS,
      },
      {
        source: "/:path*",
        missing: [{ type: "host", value: APP_HOSTNAME_PATTERN }],
        headers: PUBLIC_SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
