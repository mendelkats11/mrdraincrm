import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "@/lib/auth/session-token";

// Proxy (the renamed middleware convention, Next.js 16.3+) always runs on
// the full Node.js runtime, not Edge — which is what makes
// verifySessionCookieValue's use of node:crypto's HMAC/timingSafeEqual
// safe to call here.

const DEFAULT_APP_HOSTNAME = "app.mrdrainsk.com";

/**
 * Hostname-based split between the public site and the private app — see
 * docs/IMPLEMENTATION_PLAN.md §9.6. In development there's no real
 * subdomain, so `app.localhost`/`app.127.0.0.1` (any port) are also
 * accepted; test with e.g.
 * `curl -H "Host: app.localhost:3000" http://127.0.0.1:3000/login` — no
 * DNS or hosts-file changes needed. Chromium-based browsers also resolve
 * `*.localhost` to loopback natively.
 */
function isAppHost(host: string): boolean {
  const configured = (process.env.APP_HOSTNAME || DEFAULT_APP_HOSTNAME).split(":")[0];
  const hostWithoutPort = host.split(":")[0];
  if (hostWithoutPort === configured) return true;
  if (process.env.NODE_ENV !== "production") {
    return hostWithoutPort === "app.localhost" || hostWithoutPort === "app.127.0.0.1";
  }
  return false;
}

// Pages that must remain reachable on the app host without a session.
const PUBLIC_ON_APP_HOST_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password/",
  "/accept-invite/",
];

function isPublicOnAppHost(pathname: string): boolean {
  return PUBLIC_ON_APP_HOST_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const { pathname, search } = request.nextUrl;

  // The `/app` prefix is purely an internal rewrite target (see below) —
  // never a real client-facing path. Reject direct requests to it
  // regardless of host, so the public site can never be used to reach the
  // private route tree by guessing the prefix, and the app host can't
  // double-prefix itself.
  if (pathname.startsWith("/app")) {
    return new NextResponse(null, { status: 404 });
  }

  if (!isAppHost(host)) {
    return NextResponse.next();
  }

  if (!isPublicOnAppHost(pathname)) {
    // Fast, DB-free rejection of an obviously missing/forged cookie —
    // docs/IMPLEMENTATION_PLAN.md §8. This is a pre-filter only; the
    // authoritative check (expiry, revocation, disabled account) happens
    // in requireUser() against the database on every protected request,
    // regardless of what middleware decided.
    const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const token = verifySessionCookieValue(cookieValue);
    if (!token) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(loginUrl);
    }
  }

  const rewritten = request.nextUrl.clone();
  rewritten.pathname = `/app${pathname}`;
  return NextResponse.rewrite(rewritten);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
