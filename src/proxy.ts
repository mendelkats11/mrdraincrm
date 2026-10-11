import { NextResponse, type NextRequest } from "next/server";

// The private business app that used to live at app.mrdrainsk.com has been
// retired. If that subdomain is still pointed at this process (e.g. its DNS
// record or Hostinger domain binding hasn't been removed yet), answer
// permanently-gone instead of falling through to the public site, which
// would otherwise serve a duplicate, indexable copy of it on a second host.
export function proxy(request: NextRequest) {
  const hostname = (request.headers.get("host") || "").split(":")[0].toLowerCase();

  if (hostname.startsWith("app.")) {
    return new NextResponse("Gone", {
      status: 410,
      headers: { "Content-Type": "text/plain", "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
