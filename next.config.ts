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
const CONTENT_SECURITY_POLICY = [
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
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

// HSTS is only meaningful (and only honored by browsers) over a real HTTPS
// connection — sending it in local http:// dev is a no-op, but gating it
// keeps the distinction explicit rather than relying on browsers to ignore
// it, matching how the session cookie's `secure` flag is already gated
// (src/lib/auth/actions.ts).
if (process.env.NODE_ENV === "production") {
  SECURITY_HEADERS.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
